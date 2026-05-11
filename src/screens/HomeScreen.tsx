import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { formatINRFromPaise } from '../utils/money';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, localBalancePaise } = useAuth();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greet}>Hi, {user?.name?.split(' ')[0] ?? 'there'}</Text>
          <Text style={styles.sub}>Spendable balance (offline + synced)</Text>
        </View>
        <Pressable style={styles.bell} onPress={() => navigation.navigate('LoadWallet')}>
          <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
        </Pressable>
      </View>

      <LinearGradient colors={['#5F259F', '#7c4dff', '#3949ab']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>ProxiPay wallet</Text>
        <Text style={styles.balanceBig}>{formatINRFromPaise(localBalancePaise)}</Text>
        <View style={styles.rowChips}>
          <View style={styles.chip}>
            <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
            <Text style={styles.chipText}> Works offline</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="shield-checkmark" size={16} color="#fff" />
            <Text style={styles.chipText}> Signed locally</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.section}>Quick actions</Text>
      <View style={styles.actions}>
        <Pressable style={styles.actionTile} onPress={() => navigation.navigate('Pay')}>
          <LinearGradient colors={[colors.accent, '#0088cc']} style={styles.actionIcon}>
            <Ionicons name="qr-code-outline" size={32} color="#fff" />
          </LinearGradient>
          <Text style={styles.actionTitle}>Pay</Text>
          <Text style={styles.actionSub}>Scan merchant QR</Text>
        </Pressable>
        <Pressable style={styles.actionTile} onPress={() => navigation.navigate('Receive')}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.actionIcon}>
            <Ionicons name="download-outline" size={32} color="#fff" />
          </LinearGradient>
          <Text style={styles.actionTitle}>Receive</Text>
          <Text style={styles.actionSub}>Show your QR</Text>
        </Pressable>
      </View>

      <Pressable style={styles.addMoney} onPress={() => navigation.navigate('LoadWallet')}>
        <Ionicons name="wallet-outline" size={22} color={colors.text} />
        <Text style={styles.addMoneyText}>Add money to wallet</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greet: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sub: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  bell: { padding: 4 },
  balanceCard: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  balanceBig: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 8 },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  chipText: { color: '#fff', fontSize: 12 },
  section: { color: colors.textMuted, fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 14 },
  actionTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.chip,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  actionSub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  addMoney: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.chip,
  },
  addMoneyText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
});
