import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { rupeesInputToPaise } from '../utils/money';

export function LoadWalletScreen() {
  const { refreshUserFromServer, refreshLocalBalance } = useAuth();
  const [rupees, setRupees] = useState('');
  const [busy, setBusy] = useState(false);

  async function demoLoad() {
    const paise = rupeesInputToPaise(rupees);
    if (paise < 100) {
      Alert.alert('Amount', 'Enter at least ₹1.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/wallet/demo-load', { amountPaise: paise });
      await refreshUserFromServer();
      await refreshLocalBalance();
      Alert.alert('Wallet', 'Money added (demo mode).');
      setRupees('');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error)
          : 'Request failed';
      Alert.alert('Wallet', msg || 'Could not add money');
    } finally {
      setBusy(false);
    }
  }

  async function razorpayLoad() {
    const paise = rupeesInputToPaise(rupees);
    if (paise < 100) {
      Alert.alert('Amount', 'Enter at least ₹1.');
      return;
    }
    setBusy(true);
    try {
      const { data: order } = await api.post<{
        orderId: string;
        amountPaise: number;
        currency: string;
        keyId: string;
      }>('/wallet/razorpay/create-order', { amountPaise: paise });

      let RazorpayCheckout: { open: (o: object) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }> };
      try {
        RazorpayCheckout = require('react-native-razorpay').default;
      } catch {
        Alert.alert(
          'Razorpay',
          'Native Razorpay needs a dev build (npx expo prebuild && npx expo run:android). Use demo load for Expo Go.'
        );
        setBusy(false);
        return;
      }

      const options = {
        description: 'ProxiPay wallet load',
        image: undefined as string | undefined,
        currency: order.currency || 'INR',
        key: order.keyId,
        amount: String(order.amountPaise),
        name: 'ProxiPay',
        order_id: order.orderId,
        theme: { color: colors.primary },
      };

      const paymentData = await RazorpayCheckout.open(options);
      await api.post('/wallet/razorpay/verify', {
        orderId: paymentData.razorpay_order_id,
        paymentId: paymentData.razorpay_payment_id,
        signature: paymentData.razorpay_signature,
      });
      await refreshUserFromServer();
      await refreshLocalBalance();
      Alert.alert('Wallet', 'Payment successful.');
      setRupees('');
    } catch (e: unknown) {
      const err = e as { code?: number; description?: string; response?: { data?: { error?: string } } };
      if (err?.code === 2) {
        /* user cancelled */
      } else {
        const msg = err?.description || err?.response?.data?.error || 'Payment failed';
        Alert.alert('Razorpay', String(msg));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.label}>Amount (₹)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="100"
        placeholderTextColor={colors.textMuted}
        value={rupees}
        onChangeText={setRupees}
      />
      <Text style={styles.note}>
        Demo load credits your server wallet when ALLOW_DEMO_WALLET_LOAD=true. Razorpay uses your keys from server .env.
      </Text>
      <Pressable style={[styles.btn, busy && styles.off]} onPress={() => void demoLoad()} disabled={busy}>
        <Text style={styles.btnText}>Add money (demo)</Text>
      </Pressable>
      {Platform.OS !== 'web' ? (
        <Pressable style={[styles.btn2, busy && styles.off]} onPress={() => void razorpayLoad()} disabled={busy}>
          <Text style={styles.btn2Text}>Pay with Razorpay</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  label: { color: colors.textMuted, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.chip,
  },
  note: { color: colors.textMuted, fontSize: 13, marginVertical: 16, lineHeight: 20 },
  btn: { backgroundColor: colors.success, padding: 16, borderRadius: 14, alignItems: 'center' },
  btn2: { marginTop: 12, backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  off: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btn2Text: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
