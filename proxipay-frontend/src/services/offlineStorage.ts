import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AckPayload, SignedPayload } from "./blePayment";

export type OfflineTransactionRecord = {
  id: string;
  status: "STOREDOFFLINE";
  payerId: string;
  vendorId: string;
  amount: number;
  currency: string;
  payload: SignedPayload;
  ack: AckPayload;
  createdAt: string;
};

const OFFLINE_TRANSACTIONS_KEY = "offlineTransactions";

const readTransactions = async (): Promise<OfflineTransactionRecord[]> => {
  const raw = await AsyncStorage.getItem(OFFLINE_TRANSACTIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OfflineTransactionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const appendOfflineTransaction = async (record: OfflineTransactionRecord) => {
  const existing = await readTransactions();
  existing.push(record);
  await AsyncStorage.setItem(OFFLINE_TRANSACTIONS_KEY, JSON.stringify(existing));
};
