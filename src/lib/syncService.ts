import { api } from './api';
import { listUnsyncedPending, markTxsSynced, setLocalBalancePaise, getLocalBalancePaise } from './db';

export async function pushOfflineTransactions(): Promise<{
  syncedIds: string[];
  walletBalancePaise: number;
  error?: string;
}> {
  const pending = await listUnsyncedPending();
  if (pending.length === 0) {
    const { data } = await api.get<{ walletBalancePaise: number }>('/wallet/balance');
    await setLocalBalancePaise(data.walletBalancePaise);
    return { syncedIds: [], walletBalancePaise: data.walletBalancePaise };
  }
  const body = {
    transactions: pending.map((p) => ({
      transaction: p.transaction,
      signature: p.signature,
    })),
  };
  try {
    const { data } = await api.post<{
      results: { transactionId: string; status: string }[];
      walletBalancePaise: number;
    }>('/sync/transactions', body);
    const okIds = new Set<string>();
    for (const r of data.results) {
      if (r.status === 'applied' || r.status === 'duplicate') {
        okIds.add(r.transactionId);
      }
    }
    const syncedIds = pending.filter((p) => okIds.has(p.txId)).map((p) => p.txId);
    await markTxsSynced(syncedIds);
    await setLocalBalancePaise(data.walletBalancePaise);
    return { syncedIds, walletBalancePaise: data.walletBalancePaise };
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'response' in e;
    const err = msg ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null;
    const bal = await getLocalBalancePaise();
    return { syncedIds: [], walletBalancePaise: bal, error: err || 'Sync failed' };
  }
}
