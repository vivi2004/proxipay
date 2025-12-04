import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_BALANCE = 10000;
const WALLET_KEY_PREFIX = "walletBalance:";

type WalletSnapshot = {
  amount: number;
  updatedAt: string;
};

const getStorageKey = (userId: string) => `${WALLET_KEY_PREFIX}${userId}`;

const readSnapshot = async (userId: string): Promise<WalletSnapshot | null> => {
  const raw = await AsyncStorage.getItem(getStorageKey(userId));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as WalletSnapshot;
    if (typeof parsed?.amount === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const writeSnapshot = async (userId: string, amount: number) => {
  const snapshot: WalletSnapshot = { amount, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(snapshot));
};

export const getWalletBalance = async (userId: string): Promise<number> => {
  const existing = await readSnapshot(userId);
  if (existing) {
    return existing.amount;
  }
  await writeSnapshot(userId, DEFAULT_BALANCE);
  return DEFAULT_BALANCE;
};

export const setWalletBalance = async (userId: string, amount: number): Promise<void> => {
  await writeSnapshot(userId, amount);
};

export const deductWalletBalance = async (userId: string, amount: number): Promise<number> => {
  const current = await getWalletBalance(userId);
  if (amount > current) {
    throw new Error("Insufficient wallet balance for this transaction.");
  }
  const updated = current - amount;
  await writeSnapshot(userId, updated);
  return updated;
};
