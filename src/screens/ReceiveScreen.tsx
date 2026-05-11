import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getOrCreateKeyPair } from '../lib/cryptoKeys';
import { getLocalBalancePaise, setLocalBalancePaise, addPendingTx } from '../lib/db';
import { startReceiveServer, type ReceiveHandshake } from '../lib/proximity';
import { verifyTransactionSignature, type TransactionRecord } from '../lib/txn';
import { colors } from '../theme';
export function ReceiveScreen() {
  const { user, refreshLocalBalance } = useAuth();
  const [qrPayload, setQrPayload] = useState<string>('');
  const [hint, setHint] = useState('');
  const serverRef = useRef<{ close: () => void } | null>(null);

  const stopServer = useCallback(() => {
    serverRef.current?.close();
    serverRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!user) return;
    stopServer();
    const ip = await Network.getIpAddressAsync();
    if (!ip || ip === '0.0.0.0') {
      setHint('Connect to Wi‑Fi to get a local address. Both phones must share the same network (internet optional).');
      setQrPayload('');
      return;
    }
    setHint(`Listening on ${ip} · Ask payer to scan while on same Wi‑Fi`);
    const port = 42000 + Math.floor(Math.random() * 1800);
    const sessionSecret = Crypto.randomUUID();
    const { secretKey, publicKeyBase64 } = await getOrCreateKeyPair();
    const handshake: ReceiveHandshake = {
      v: 1,
      channel: 'lan_tcp',
      host: ip,
      port,
      sessionSecret,
      receiverId: user.id,
      receiverPublicKey: publicKeyBase64,
      displayName: user.name,
    };
    setQrPayload(JSON.stringify(handshake));

    const srv = startReceiveServer({
      port,
      sessionSecret,
      receiverId: user.id,
      receiverSecretKey: secretKey,
      receiverPublicKey: publicKeyBase64,
      onPayment: async ({ transaction, signature }) => {
        const tr = transaction as TransactionRecord;
        if (tr.receiverId !== user.id) throw new Error('Wrong receiver');
        if (!verifyTransactionSignature(tr, signature)) throw new Error('Bad signature');
        const bal = await getLocalBalancePaise();
        await setLocalBalancePaise(bal + tr.amountPaise);
        await addPendingTx({ txId: tr.transactionId, role: 'receiver', transaction: tr, signature });
        await refreshLocalBalance();
      },
    });
    serverRef.current = srv;
  }, [user, stopServer, refreshLocalBalance]);

  useFocusEffect(
    useCallback(() => {
      void start();
      return () => stopServer();
    }, [start, stopServer])
  );

  useEffect(() => {
    return () => stopServer();
  }, [stopServer]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Receive payment</Text>
      <Text style={styles.sub}>{hint}</Text>
      <View style={styles.qrBox}>
        {qrPayload ? (
          <QRCode value={qrPayload} size={220} color="#1a1a2e" backgroundColor="#fff" />
        ) : (
          <Text style={styles.wait}>Waiting for network…</Text>
        )}
      </View>
      <Text style={styles.note}>
        This follows the ProxiPay model: QR carries a secure session; signed transaction packets move directly between
        phones. When you go online, balances reconcile with the server.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20, alignItems: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', alignSelf: 'flex-start' },
  sub: { color: colors.textMuted, marginTop: 8, marginBottom: 20, lineHeight: 20, alignSelf: 'flex-start' },
  qrBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wait: { color: colors.textMuted, padding: 40 },
  note: { marginTop: 24, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
