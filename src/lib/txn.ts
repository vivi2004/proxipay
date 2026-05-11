import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';

export type TransactionRecord = {
  transactionId: string;
  senderId: string;
  receiverId: string;
  amountPaise: number;
  timestamp: number;
  senderPublicKey: string;
};

export function canonicalTxString(tr: TransactionRecord): string {
  return JSON.stringify({
    transactionId: tr.transactionId,
    senderId: tr.senderId,
    receiverId: tr.receiverId,
    amountPaise: tr.amountPaise,
    timestamp: tr.timestamp,
    senderPublicKey: tr.senderPublicKey,
  });
}

export function signTransaction(tr: TransactionRecord, secretKey: Uint8Array): string {
  const msg = decodeUTF8(canonicalTxString(tr));
  const sig = nacl.sign.detached(msg, secretKey);
  return encodeBase64(sig);
}

export function verifyTransactionSignature(tr: TransactionRecord, signatureBase64: string): boolean {
  const msg = decodeUTF8(canonicalTxString(tr));
  const sig = decodeBase64(signatureBase64);
  const pub = decodeBase64(tr.senderPublicKey);
  return nacl.sign.detached.verify(msg, sig, pub);
}

export function canonicalAckString(ack: {
  transactionId: string;
  receiverId: string;
  timestamp: number;
}): string {
  return JSON.stringify({
    transactionId: ack.transactionId,
    receiverId: ack.receiverId,
    timestamp: ack.timestamp,
  });
}

export function signAck(
  ack: { transactionId: string; receiverId: string; timestamp: number },
  secretKey: Uint8Array
): string {
  const msg = decodeUTF8(canonicalAckString(ack));
  return encodeBase64(nacl.sign.detached(msg, secretKey));
}

export function verifyAck(
  ack: { transactionId: string; receiverId: string; timestamp: number },
  signatureBase64: string,
  receiverPublicKeyBase64: string
): boolean {
  const msg = decodeUTF8(canonicalAckString(ack));
  const sig = decodeBase64(signatureBase64);
  const pub = decodeBase64(receiverPublicKeyBase64);
  return nacl.sign.detached.verify(msg, sig, pub);
}
