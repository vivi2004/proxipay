import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { appendOfflineTransaction } from "./offlineStorage";
import { getWalletBalance, setWalletBalance } from "./walletStorage";

type VendorAdvertisement = {
  id: string;
  receiverId: string;
  sessionNonce: string;
  profileHash: string;
  shortCode: string;
  signalStrength: number;
  vendorPublicKey: string;
  certificate: string;
};

type PaymentInput = {
  vendor: VendorAdvertisement;
  amount: number;
  pin: string;
  payerId: string;
  payerName?: string;
  onStatusUpdate?: (status: string) => void;
};

type PaymentResult = {
  ackId: string;
  recordId: string;
};

type TransactionPayload = {
  payloadId: string;
  amount: number;
  currency: string;
  payerId: string;
  payerPublicKey: string;
  payerName?: string;
  vendorId: string;
  sessionNonce: string;
  timestamp: string;
  certificate: string;
};

type SignedPayload = TransactionPayload & {
  signature: string;
};

type AckPayload = {
  ackId: string;
  payloadId: string;
  vendorId: string;
  sessionNonce: string;
  timestamp: string;
  signature: string;
  vendorPublicKey: string;
  certificate: string;
};

type VendorKeyMaterial = {
  privateKey: Uint8Array;
  publicKeyHex: string;
  certificate: string;
};

type VendorBlueprint = {
  id: string;
  receiverId: string;
  profileHash: string;
  shortCode: string;
  baseSignalStrength: number;
};

const BASE_CURRENCY = "XOF";
const encoder = new TextEncoder();
const vendorKeyCache = new Map<string, VendorKeyMaterial>();

// noble needs a sync sha512 implementation in React Native environments
(ed25519.etc as any).sha512Sync = (...messages: Uint8Array[]) => sha512(ed25519.etc.concatBytes(...messages));

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const randomId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const deriveSeed = (input: string): Uint8Array => sha512(encoder.encode(input)).slice(0, 32);

const notify = (cb: PaymentInput["onStatusUpdate"], status: string) => {
  if (cb) {
    cb(status);
  }
};

const encodeForSigning = (data: object) => encoder.encode(JSON.stringify(data));

const getVendorKeyMaterial = async (id: string, receiverId: string, profileHash: string): Promise<VendorKeyMaterial> => {
  const cached = vendorKeyCache.get(id);
  if (cached) {
    return cached;
  }

  const seed = deriveSeed(`vendor|${id}|${profileHash}|proxipay`);
  const privateKey = new Uint8Array(seed);
  const publicKeyBytes = await ed25519.getPublicKey(privateKey);
  const certificateBytes = sha256(ed25519.etc.concatBytes(encoder.encode(receiverId), publicKeyBytes));
  const material: VendorKeyMaterial = {
    privateKey,
    publicKeyHex: bytesToHex(publicKeyBytes),
    certificate: bytesToHex(certificateBytes),
  };
  vendorKeyCache.set(id, material);
  return material;
};

const vendorBlueprints: VendorBlueprint[] = [
  {
    id: "vendor-bridge",
    receiverId: "RX-4421",
    profileHash: "a1b2c3",
    shortCode: "441",
    baseSignalStrength: -48,
  },
  {
    id: "vendor-cafe",
    receiverId: "RX-2294",
    profileHash: "f0e1d2",
    shortCode: "229",
    baseSignalStrength: -60,
  },
];

const createVendorAdvertisement = async (blueprint: VendorBlueprint): Promise<VendorAdvertisement> => {
  const keyMaterial = await getVendorKeyMaterial(blueprint.id, blueprint.receiverId, blueprint.profileHash);
  const jitter = Math.floor(Math.random() * 8) - 4;
  return {
    id: blueprint.id,
    receiverId: blueprint.receiverId,
    sessionNonce: randomId("nonce"),
    profileHash: blueprint.profileHash,
    shortCode: blueprint.shortCode,
    signalStrength: blueprint.baseSignalStrength + jitter,
    vendorPublicKey: keyMaterial.publicKeyHex,
    certificate: keyMaterial.certificate,
  };
};

const discoverSampleVendors = async (): Promise<VendorAdvertisement[]> => {
  const adverts = await Promise.all(vendorBlueprints.map(createVendorAdvertisement));
  return adverts.sort((a, b) => a.signalStrength - b.signalStrength);
};

const unlockPrivateKey = async (pin: string, payerId: string) => {
  await delay(120);
  if (pin.length < 4) {
    throw new Error("PIN must be at least 4 digits");
  }

  const seed = deriveSeed(`payer|${payerId}|${pin}|proxipay`);
  const privateKey = new Uint8Array(seed);
  const publicKeyBytes = await ed25519.getPublicKey(privateKey);
  const certificateBytes = sha256(ed25519.etc.concatBytes(encoder.encode(payerId), publicKeyBytes));

  return {
    privateKey,
    publicKey: bytesToHex(publicKeyBytes),
    certificate: bytesToHex(certificateBytes),
  };
};

const signPayload = async (payload: TransactionPayload, privateKey: Uint8Array): Promise<SignedPayload> => {
  const message = encodeForSigning(payload);
  const signatureBytes = await ed25519.sign(message, privateKey);
  return {
    ...payload,
    signature: bytesToHex(signatureBytes),
  };
};

const exchangePayloads = async (signedPayload: SignedPayload, vendor: VendorAdvertisement): Promise<AckPayload> => {
  await delay(200);

  const payloadBody: TransactionPayload = {
    payloadId: signedPayload.payloadId,
    amount: signedPayload.amount,
    currency: signedPayload.currency,
    payerId: signedPayload.payerId,
    payerPublicKey: signedPayload.payerPublicKey,
    payerName: signedPayload.payerName,
    vendorId: signedPayload.vendorId,
    sessionNonce: signedPayload.sessionNonce,
    timestamp: signedPayload.timestamp,
    certificate: signedPayload.certificate,
  };

  const verificationMessage = encodeForSigning(payloadBody);
  const isValidSignature = await ed25519.verify(
    hexToBytes(signedPayload.signature),
    verificationMessage,
    hexToBytes(signedPayload.payerPublicKey),
  );

  if (!isValidSignature) {
    throw new Error("Vendor rejected payload signature");
  }

  const vendorKeys = await getVendorKeyMaterial(vendor.id, vendor.receiverId, vendor.profileHash);

  const ackBody = {
    ackId: randomId("ack"),
    payloadId: signedPayload.payloadId,
    vendorId: vendor.receiverId,
    sessionNonce: signedPayload.sessionNonce,
    timestamp: new Date().toISOString(),
  };

  const ackMessage = encodeForSigning(ackBody);
  const ackSignature = await ed25519.sign(ackMessage, vendorKeys.privateKey);

  return {
    ...ackBody,
    signature: bytesToHex(ackSignature),
    vendorPublicKey: vendorKeys.publicKeyHex,
    certificate: vendorKeys.certificate,
  };
};

const verifyAckSignature = async (ack: AckPayload, vendor: VendorAdvertisement) => {
  if (ack.vendorPublicKey !== vendor.vendorPublicKey) {
    throw new Error("Vendor key mismatch detected");
  }
  if (ack.certificate !== vendor.certificate) {
    throw new Error("Vendor certificate mismatch detected");
  }

  const ackBody = {
    ackId: ack.ackId,
    payloadId: ack.payloadId,
    vendorId: ack.vendorId,
    sessionNonce: ack.sessionNonce,
    timestamp: ack.timestamp,
  };

  const isAckValid = await ed25519.verify(
    hexToBytes(ack.signature),
    encodeForSigning(ackBody),
    hexToBytes(vendor.vendorPublicKey),
  );

  if (!isAckValid) {
    throw new Error("Invalid ACK signature from vendor");
  }
};

export const discoverVendors = async (): Promise<VendorAdvertisement[]> => {
  await delay(300);
  return discoverSampleVendors();
};

export const performPayment = async (input: PaymentInput): Promise<PaymentResult> => {
  const currentBalance = await getWalletBalance(input.payerId);
  if (input.amount > currentBalance) {
    throw new Error(`Insufficient wallet balance. Available balance is ${currentBalance} ${BASE_CURRENCY}.`);
  }

  notify(input.onStatusUpdate, "Unlocking your wallet key...");
  const keyMaterial = await unlockPrivateKey(input.pin, input.payerId);

  notify(input.onStatusUpdate, "Preparing transaction payload...");
  const basePayload: TransactionPayload = {
    payloadId: randomId("txn"),
    amount: input.amount,
    currency: BASE_CURRENCY,
    payerId: input.payerId,
    payerPublicKey: keyMaterial.publicKey,
    ...(input.payerName ? { payerName: input.payerName } : {}),
    vendorId: input.vendor.receiverId,
    sessionNonce: input.vendor.sessionNonce,
    timestamp: new Date().toISOString(),
    certificate: keyMaterial.certificate,
  };

  const signedPayload = await signPayload(basePayload, keyMaterial.privateKey);

  notify(input.onStatusUpdate, "Exchanging payload over BLE...");
  const ack = await exchangePayloads(signedPayload, input.vendor);

  notify(input.onStatusUpdate, "Validating vendor acknowledgement...");
  await verifyAckSignature(ack, input.vendor);

  notify(input.onStatusUpdate, "Persisting offline record...");
  const recordId = randomId("offline");

  await appendOfflineTransaction({
    id: recordId,
    status: "STOREDOFFLINE",
    payerId: input.payerId,
    vendorId: input.vendor.receiverId,
    amount: input.amount,
    currency: basePayload.currency,
    payload: signedPayload,
    ack,
    createdAt: new Date().toISOString(),
  });

  await setWalletBalance(input.payerId, currentBalance - input.amount);

  notify(input.onStatusUpdate, "Transaction stored offline.");
  return { ackId: ack.ackId, recordId };
};

export type { VendorAdvertisement, PaymentInput, PaymentResult, SignedPayload, AckPayload };
