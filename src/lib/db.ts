import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('proxipay.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS meta (
        k TEXT PRIMARY KEY NOT NULL,
        v TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pending_tx (
        tx_id TEXT PRIMARY KEY NOT NULL,
        role TEXT NOT NULL,
        transaction_json TEXT NOT NULL,
        signature TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);
  }
  return db;
}

export async function setMeta(k: string, v: string): Promise<void> {
  const d = await getDb();
  await d.runAsync('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)', [k, v]);
}

export async function getMeta(k: string): Promise<string | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ v: string }>('SELECT v FROM meta WHERE k = ?', [k]);
  return row?.v ?? null;
}

export async function getLocalBalancePaise(): Promise<number> {
  const v = await getMeta('local_balance_paise');
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export async function setLocalBalancePaise(n: number): Promise<void> {
  await setMeta('local_balance_paise', String(Math.max(0, Math.floor(n))));
}

export async function addPendingTx(params: {
  txId: string;
  role: 'sender' | 'receiver';
  transaction: object;
  signature: string;
}): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO pending_tx (tx_id, role, transaction_json, signature, synced, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [params.txId, params.role, JSON.stringify(params.transaction), params.signature, Date.now()]
  );
}

export async function listUnsyncedPending(): Promise<
  { txId: string; transaction: object; signature: string; role: string }[]
> {
  const d = await getDb();
  const rows = await d.getAllAsync<{
    tx_id: string;
    transaction_json: string;
    signature: string;
    role: string;
  }>('SELECT tx_id, transaction_json, signature, role FROM pending_tx WHERE synced = 0');
  return rows.map((r) => ({
    txId: r.tx_id,
    transaction: JSON.parse(r.transaction_json),
    signature: r.signature,
    role: r.role,
  }));
}

export async function markTxsSynced(txIds: string[]): Promise<void> {
  if (txIds.length === 0) return;
  const d = await getDb();
  const placeholders = txIds.map(() => '?').join(',');
  await d.runAsync(`UPDATE pending_tx SET synced = 1 WHERE tx_id IN (${placeholders})`, txIds);
}

export async function listRecentPending(limit = 50): Promise<
  {
    txId: string;
    role: string;
    synced: boolean;
    createdAt: number;
    amountPaise: number;
  }[]
> {
  const d = await getDb();
  const rows = await d.getAllAsync<{
    tx_id: string;
    role: string;
    synced: number;
    created_at: number;
    transaction_json: string;
  }>(
    `SELECT tx_id, role, synced, created_at, transaction_json FROM pending_tx ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => {
    let amountPaise = 0;
    try {
      const t = JSON.parse(r.transaction_json) as { amountPaise?: number };
      amountPaise = Math.floor(Number(t.amountPaise) || 0);
    } catch {
      /* ignore */
    }
    return {
      txId: r.tx_id,
      role: r.role,
      synced: r.synced === 1,
      createdAt: r.created_at,
      amountPaise,
    };
  });
}
