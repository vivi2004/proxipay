import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const SK_KEY = 'proxipay_ed25519_secret';
const PK_KEY = 'proxipay_ed25519_public';

export async function getOrCreateKeyPair(): Promise<{
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  publicKeyBase64: string;
}> {
  const existingSk = await SecureStore.getItemAsync(SK_KEY);
  const existingPk = await SecureStore.getItemAsync(PK_KEY);
  if (existingSk && existingPk) {
    const secretKey = decodeBase64(existingSk);
    const publicKey = decodeBase64(existingPk);
    return { secretKey, publicKey, publicKeyBase64: existingPk };
  }
  const pair = nacl.sign.keyPair();
  const skB64 = encodeBase64(pair.secretKey);
  const pkB64 = encodeBase64(pair.publicKey);
  await SecureStore.setItemAsync(SK_KEY, skB64);
  await SecureStore.setItemAsync(PK_KEY, pkB64);
  return {
    secretKey: pair.secretKey,
    publicKey: pair.publicKey,
    publicKeyBase64: pkB64,
  };
}

export async function getStoredPublicKeyBase64(): Promise<string | null> {
  return SecureStore.getItemAsync(PK_KEY);
}

/** Server must store the same public key you register with. */
export async function ensurePublicKeyMatchesServer(serverPublicKey: string): Promise<boolean> {
  const local = await SecureStore.getItemAsync(PK_KEY);
  return local === serverPublicKey;
}
