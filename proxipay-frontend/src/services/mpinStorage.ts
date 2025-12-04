import AsyncStorage from "@react-native-async-storage/async-storage";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const encoder = new TextEncoder();

const keyForUser = (userId: string) => `mpin:${userId}`;

const hashMPIN = (userId: string, mpin: string) => {
  return bytesToHex(sha256(encoder.encode(`${userId}:${mpin}`)));
};

export const storeMPIN = async (userId: string, mpin: string) => {
  const hashed = hashMPIN(userId, mpin);
  await AsyncStorage.setItem(keyForUser(userId), hashed);
};

const getStoredHash = async (userId: string) => {
  return AsyncStorage.getItem(keyForUser(userId));
};

export const hasStoredMPIN = async (userId: string) => {
  const stored = await getStoredHash(userId);
  return typeof stored === "string" && stored.length > 0;
};

export const verifyMPIN = async (userId: string, mpin: string) => {
  const stored = await getStoredHash(userId);
  if (!stored) {
    return false;
  }
  return stored === hashMPIN(userId, mpin);
};

export const clearMPIN = async (userId: string) => {
  await AsyncStorage.removeItem(keyForUser(userId));
};
