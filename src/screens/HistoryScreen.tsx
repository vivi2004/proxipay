import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listRecentPending } from '../lib/db';
import { colors } from '../theme';
import { formatINRFromPaise } from '../utils/money';

type Row = Awaited<ReturnType<typeof listRecentPending>>[number];

export function HistoryScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const r = await listRecentPending(80);
    setRows(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.sub}>Offline payments stay here until the server reconciles them.</Text>
      <FlatList
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={(item) => item.txId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={<Text style={styles.empty}>No offline payments yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.dot} />
            <View style={styles.body}>
              <Text style={styles.rowTitle}>
                {item.role === 'sender' ? 'Paid' : 'Received'} {formatINRFromPaise(item.amountPaise)}
              </Text>
              <Text style={styles.meta}>
                {item.synced ? 'Synced with bank' : 'Pending sync'} · {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 16 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', paddingHorizontal: 16 },
  sub: { color: colors.textMuted, paddingHorizontal: 16, marginTop: 6, marginBottom: 12, lineHeight: 20 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  row: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.chip },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 6, marginRight: 12 },
  body: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
});
