import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../components/DealerAppBar';
import { DealerMenuSheet } from '../components/DealerMenuSheet';
import { DealerStackHeader } from '../components/DealerStackHeader';
import { api } from '../lib/api';

export default function StockAlertsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [stockType, setStockType] = useState('low');
  const [groups, setGroups] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/dealer/products/stock-alerts', {
          params: { stock_type: stockType },
        });
        if (!mounted) return;
        setGroups(data?.groups || []);
        setTotalProducts(data?.total_products ?? 0);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load stock alerts.');
        setGroups([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [stockType]);

  const rows = useMemo(() => {
    const out = [];
    for (const g of groups) {
      for (const p of g.products || []) {
        out.push({
          key: `${g.subcategory_id}-${p.id}`,
          subcategoryId: g.subcategory_id,
          subcategoryName: g.subcategory_name,
          product: p,
        });
      }
    }
    return out;
  }, [groups]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <DealerStackHeader title="Stock alerts" />
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggle, stockType === 'low' && styles.toggleOn]}
          onPress={() => setStockType('low')}
        >
          <Text style={[styles.toggleText, stockType === 'low' && styles.toggleTextOn]}>Low</Text>
        </Pressable>
        <Pressable
          style={[styles.toggle, stockType === 'out' && styles.toggleOn]}
          onPress={() => setStockType('out')}
        >
          <Text style={[styles.toggleText, stockType === 'out' && styles.toggleTextOn]}>Out</Text>
        </Pressable>
      </View>
      <Text style={styles.countLine}>
        {totalProducts} product{totalProducts === 1 ? '' : 's'} ({stockType === 'low' ? 'low stock' : 'out of stock'})
      </Text>
      {loading ? <ActivityIndicator style={styles.loader} color="#EA580C" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Nothing in this list.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push(`/inventory/${item.subcategoryId}/products/${item.product.id}`)
            }
          >
            <Text style={styles.cat}>{item.subcategoryName}</Text>
            <Text style={styles.pname}>
              {(item.product.brand || '').trim()} {(item.product.name || '').trim()}
            </Text>
            <Text style={styles.qty}>{item.product.current_quantity ?? 0} boxes</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  list: { flex: 1 },
  toggleRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  toggleOn: { backgroundColor: '#FFF7ED' },
  toggleText: { fontWeight: '600', color: '#64748B' },
  toggleTextOn: { color: '#C2410C' },
  countLine: { paddingHorizontal: 16, color: '#475569', marginBottom: 8 },
  loader: { marginTop: 8 },
  error: { color: '#DC2626', paddingHorizontal: 16 },
  listPad: { padding: 16, paddingBottom: 24, gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  cat: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  pname: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  qty: { marginTop: 6, fontWeight: '600', color: '#DC2626' },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 24 },
});
