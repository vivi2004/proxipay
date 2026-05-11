import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/config';
import { colors } from '../theme';

export function ProfileScreen() {
  const { user, logout, syncNow } = useAuth();
  const [syncing, setSyncing] = useState(false);

  return (
    <View style={styles.root}>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>API</Text>
        <Text style={styles.cardVal}>{API_URL}</Text>
        <Text style={styles.hint}>Physical device: set expo.extra.apiUrl in app.json to your PC LAN IP.</Text>
      </View>
      <Pressable
        style={[styles.btn, syncing && styles.off]}
        disabled={syncing}
        onPress={async () => {
          setSyncing(true);
          const r = await syncNow();
          setSyncing(false);
          Alert.alert(r.ok ? 'Synced' : 'Sync issue', r.message || (r.ok ? 'Done' : 'Failed'));
        }}
      >
        <Text style={styles.btnText}>{syncing ? 'Syncing…' : 'Sync offline queue now'}</Text>
      </Pressable>
      <Pressable style={styles.outline} onPress={() => void logout()}>
        <Text style={styles.outlineText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 28 },
  name: { color: colors.text, fontSize: 24, fontWeight: '700' },
  email: { color: colors.textMuted, marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.chip, marginBottom: 20 },
  cardLabel: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase' },
  cardVal: { color: colors.accent, marginTop: 6, fontSize: 13 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 10, lineHeight: 18 },
  btn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  off: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  outline: { marginTop: 14, padding: 16, alignItems: 'center' },
  outlineText: { color: colors.danger, fontWeight: '600', fontSize: 16 },
});
