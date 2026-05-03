import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../components/DealerAppBar';
import { DealerMenuSheet } from '../components/DealerMenuSheet';
import { DealerStackHeader } from '../components/DealerStackHeader';
import { api } from '../lib/api';

function actionColor(action) {
  if (action === 'quantity_add') return '#16A34A';
  if (action === 'quantity_subtract') return '#DC2626';
  return '#64748B';
}

export default function ActivityScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get('/dealer/dashboard/recent-activity', { params: { limit: 50 } });
        if (!mounted) return;
        setItems(data?.activities || []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load activity.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <DealerStackHeader title="Recent activity" />
      <Text style={styles.sub}>Latest changes across your inventory.</Text>
      {loading ? <ActivityIndicator style={styles.loader} color="#EA580C" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        style={styles.listFlex}
        data={items}
        keyExtractor={(item, index) => `${item.created_at || ''}-${index}`}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No activity yet.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: actionColor(item.action) }]} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowMeta}>
                {item.time}
                {item.actor ? ` · ${item.actor}` : ''}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  listFlex: { flex: 1 },
  sub: { paddingHorizontal: 16, color: '#64748B', marginBottom: 8 },
  loader: { marginTop: 8 },
  error: { color: '#DC2626', paddingHorizontal: 16 },
  listPad: { padding: 16, paddingBottom: 32, gap: 12 },
  row: { flexDirection: 'row', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  rowMeta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 24 },
});
