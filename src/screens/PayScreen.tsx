import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getOrCreateKeyPair } from '../lib/cryptoKeys';
import { getLocalBalancePaise, setLocalBalancePaise, addPendingTx } from '../lib/db';
import { parseReceiveQr, sendPaymentOverTcp } from '../lib/proximity';
import type { ReceiveHandshake } from '../lib/proximity';
import { signTransaction, type TransactionRecord } from '../lib/txn';
import { colors } from '../theme';
import { formatINRFromPaise, rupeesInputToPaise } from '../utils/money';

type Props = NativeStackScreenProps<any, 'Pay'>;

export function PayScreen({ navigation }: Props) {
  const { user, refreshLocalBalance } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [handshake, setHandshake] = useState<ReceiveHandshake | null>(null);
  const [rupeesText, setRupeesText] = useState('');
  const [busy, setBusy] = useState(false);
  const scanLock = useRef(false);

  useFocusEffect(
    useCallback(() => {
      scanLock.current = false;
    }, [])
  );

  const onBarcode = useCallback(({ data }: { data: string }) => {
    if (scanLock.current || busy) return;
    const h = parseReceiveQr(data);
    if (!h) return;
    if (!h.host || h.host === '0.0.0.0') {
      scanLock.current = true;
      Alert.alert('Receiver offline', 'Merchant must be on the same Wi‑Fi so their phone has a local IP.', [
        { text: 'OK', onPress: () => (scanLock.current = false) },
      ]);
      return;
    }
    scanLock.current = true;
    setHandshake(h);
  }, [busy]);

  async function confirmPay() {
    if (!handshake || !user) return;
    const amountPaise = rupeesInputToPaise(rupeesText);
    if (amountPaise < 100) {
      Alert.alert('Amount', 'Minimum payment is ₹1.');
      return;
    }
    const balance = await getLocalBalancePaise();
    if (balance < amountPaise) {
      Alert.alert('Insufficient balance', `You have ${formatINRFromPaise(balance)}. Add money or reduce amount.`);
      return;
    }
    setBusy(true);
    try {
      const { secretKey, publicKeyBase64 } = await getOrCreateKeyPair();
      const tr: TransactionRecord = {
        transactionId: Crypto.randomUUID(),
        senderId: user.id,
        receiverId: handshake.receiverId,
        amountPaise,
        timestamp: Date.now(),
        senderPublicKey: publicKeyBase64,
      };
      const signature = signTransaction(tr, secretKey);
      await sendPaymentOverTcp({
        host: handshake.host,
        port: handshake.port,
        sessionSecret: handshake.sessionSecret,
        transaction: tr,
        signature,
        receiverPublicKey: handshake.receiverPublicKey,
      });
      await setLocalBalancePaise(balance - amountPaise);
      await addPendingTx({ txId: tr.transactionId, role: 'sender', transaction: tr, signature });
      await refreshLocalBalance();
      Alert.alert('Paid', `Sent ${formatINRFromPaise(amountPaise)} to ${handshake.displayName}. Will sync when online.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : 'Payment failed. Keep receiver screen open and verify both devices are on same Wi‑Fi.';
      Alert.alert('Payment', msg);
    } finally {
      setBusy(false);
    }
  }

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Camera access is needed to scan the merchant QR.</Text>
        <Pressable style={styles.btn} onPress={() => void requestPermission()}>
          <Text style={styles.btnText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  if (!handshake) {
    return (
      <View style={styles.flex}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onBarcode}
        />
        <View style={styles.overlay}>
          <Text style={styles.scanTitle}>Point at merchant QR</Text>
          <Text style={styles.scanSub}>Same Wi‑Fi as merchant · No internet required for transfer</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pad}>
      <Text style={styles.merchant}>Paying {handshake.displayName}</Text>
      <Text style={styles.label}>Amount (₹)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={colors.textMuted}
        value={rupeesText}
        onChangeText={setRupeesText}
      />
      <Pressable style={[styles.payBtn, busy && styles.off]} onPress={() => void confirmPay()} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>Confirm & pay offline</Text>}
      </Pressable>
      <Pressable
        onPress={() => {
          scanLock.current = false;
          setHandshake(null);
        }}
      >
        <Text style={styles.rescan}>Scan different QR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  info: { color: colors.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  btn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  scanTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scanSub: { color: 'rgba(255,255,255,0.75)', marginTop: 6, fontSize: 13 },
  pad: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  merchant: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 20 },
  label: { color: colors.textMuted, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 22,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.chip,
  },
  payBtn: {
    marginTop: 24,
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  off: { opacity: 0.7 },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  rescan: { color: colors.accent, marginTop: 20, textAlign: 'center' },
});
