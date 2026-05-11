import TcpSocket from 'react-native-tcp-socket';
import type { TransactionRecord } from './txn';
import { signAck, verifyAck } from './txn';

const decoder = new TextDecoder();

function bytesToString(chunk: unknown): string {
  if (typeof chunk === 'string') return chunk;
  if (chunk instanceof Uint8Array) return decoder.decode(chunk);
  if (Array.isArray(chunk)) return decoder.decode(new Uint8Array(chunk));
  return decoder.decode(new Uint8Array(chunk as ArrayBuffer));
}

export type ReceiveHandshake = {
  v: 1;
  channel: 'lan_tcp';
  host: string;
  port: number;
  sessionSecret: string;
  receiverId: string;
  receiverPublicKey: string;
  displayName: string;
};

function parseHandshake(raw: string): ReceiveHandshake | null {
  try {
    const o = JSON.parse(raw) as ReceiveHandshake;
    if (o?.v !== 1 || o.channel !== 'lan_tcp') return null;
    if (!o.host || !o.port || !o.sessionSecret || !o.receiverId || !o.receiverPublicKey) return null;
    return o;
  } catch {
    return null;
  }
}

export function parseReceiveQr(data: string): ReceiveHandshake | null {
  const t = data.trim();
  return parseHandshake(t);
}

type WirePay = {
  type: 'PAY';
  sessionSecret: string;
  transaction: TransactionRecord;
  signature: string;
};

type WireAck = {
  type: 'ACK';
  transactionId: string;
  receiverId: string;
  timestamp: number;
  signature: string;
};

function encodeLine(obj: object): string {
  return `${JSON.stringify(obj)}\n`;
}

export function startReceiveServer(params: {
  port: number;
  sessionSecret: string;
  receiverId: string;
  receiverSecretKey: Uint8Array;
  receiverPublicKey: string;
  onPayment: (payload: { transaction: TransactionRecord; signature: string }) => Promise<void>;
}): { close: () => void } {
  const server = TcpSocket.createServer((socket) => {
    let buf = '';
    socket.on('data', async (chunk) => {
      try {
        buf += bytesToString(chunk);
        const idx = buf.indexOf('\n');
        if (idx === -1) return;
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        const msg = JSON.parse(line) as WirePay | { type: string };
        if (msg.type !== 'PAY') return;
        const pay = msg as WirePay;
        if (pay.sessionSecret !== params.sessionSecret) {
          socket.write(encodeLine({ type: 'ERR', code: 'SESSION' }));
          socket.destroy();
          return;
        }
        try {
          await params.onPayment({ transaction: pay.transaction, signature: pay.signature });
        } catch {
          socket.write(encodeLine({ type: 'ERR', code: 'VERIFY' }));
          socket.destroy();
          return;
        }
        const ts = Date.now();
        const ackBody = {
          transactionId: pay.transaction.transactionId,
          receiverId: params.receiverId,
          timestamp: ts,
        };
        const sig = signAck(ackBody, params.receiverSecretKey);
        socket.write(
          encodeLine({
            type: 'ACK',
            ...ackBody,
            signature: sig,
          } satisfies WireAck)
        );
        socket.end();
      } catch {
        try {
          socket.destroy();
        } catch {
          /* */
        }
      }
    });
    socket.on('error', () => {});
  });

  server.listen({ port: params.port, host: '0.0.0.0' }, () => {});

  server.on('error', () => {});

  return {
    close: () => {
      try {
        server.close();
      } catch {
        /* */
      }
    },
  };
}

export function sendPaymentOverTcp(params: {
  host: string;
  port: number;
  sessionSecret: string;
  transaction: TransactionRecord;
  signature: string;
  receiverPublicKey: string;
  timeoutMs?: number;
}): Promise<void> {
  const timeoutMs = params.timeoutMs ?? 20000;
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      try {
        sock.destroy();
      } catch {
        /* */
      }
      reject(new Error(message));
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      try {
        sock.destroy();
      } catch {
        /* */
      }
      resolve();
    };

    const t = setTimeout(() => {
      fail('Payment timed out. Keep receiver screen open and ensure both phones are on the same Wi‑Fi.');
    }, timeoutMs);

    const sock = TcpSocket.createConnection({ port: params.port, host: params.host }, () => {
      sock.write(
        encodeLine({
          type: 'PAY',
          sessionSecret: params.sessionSecret,
          transaction: params.transaction,
          signature: params.signature,
        } satisfies WirePay)
      );
    });

    let buf = '';
    sock.on('data', (chunk) => {
      buf += bytesToString(chunk);
      const idx = buf.indexOf('\n');
      if (idx === -1) return;
      const line = buf.slice(0, idx).trim();
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        if (parsed.type === 'ERR') {
          throw new Error(parsed.code === 'SESSION' ? 'Session mismatch' : 'Receiver rejected payment');
        }
        const ack = parsed as WireAck;
        if (ack.type !== 'ACK') throw new Error('Bad ACK');
        const ok = verifyAck(
          {
            transactionId: ack.transactionId,
            receiverId: ack.receiverId,
            timestamp: ack.timestamp,
          },
          ack.signature,
          params.receiverPublicKey
        );
        if (!ok || ack.transactionId !== params.transaction.transactionId) {
          throw new Error('ACK verify failed');
        }
        succeed();
      } catch (e) {
        fail(e instanceof Error ? e.message : 'ACK failed');
      }
    });

    sock.on('error', (err) => {
      const e = err as { code?: string; message?: string };
      const code = String(e?.code || '');
      if (code === 'ECONNREFUSED') {
        fail(
          `Receiver not reachable at ${params.host}:${params.port}. Keep Receive screen open on merchant phone and retry.`
        );
        return;
      }
      fail(e?.message || 'TCP connection failed');
    });

    sock.on('close', () => {
      if (!settled) {
        fail('Connection closed before confirmation. Retry while keeping receiver QR screen active.');
      }
    });
  });
}
