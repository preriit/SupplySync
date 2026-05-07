import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../components/DealerAppBar';
import { DealerMenuSheet } from '../components/DealerMenuSheet';
import { DealerTabBar } from '../components/DealerTabBar';
import { api } from '../lib/api';
import { FONT } from '../theme/typography';

const SLATE = '#0F172A';
const MUTED = '#64748B';
const BRAND_ORANGE = '#EA580C';
const LOW_STOCK_THRESHOLD = 20;
const QUANTITY_UNIT = 'boxes';

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
      <View style={styles.body}>
        <Text style={styles.pageTitle}>Stock alerts</Text>
        <Text style={styles.subtitle}>
          Low: Products below {LOW_STOCK_THRESHOLD} {QUANTITY_UNIT}. Out of Stock: Products with 0{' '}
          {QUANTITY_UNIT}.
        </Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggle, stockType === 'low' && styles.toggleOn]}
            onPress={() => setStockType('low')}
            accessibilityRole="tab"
            accessibilityState={{ selected: stockType === 'low' }}
          >
            <Text style={[styles.toggleText, stockType === 'low' && styles.toggleTextOn]}>Low</Text>
          </Pressable>
          <Pressable
            style={[styles.toggle, stockType === 'out' && styles.toggleOn]}
            onPress={() => setStockType('out')}
            accessibilityRole="tab"
            accessibilityState={{ selected: stockType === 'out' }}
          >
            <Text style={[styles.toggleText, stockType === 'out' && styles.toggleTextOn]}>
              Out of Stock
            </Text>
          </Pressable>
        </View>
        <Text style={styles.countLine}>
          {totalProducts} product{totalProducts === 1 ? '' : 's'} ({stockType === 'low' ? 'low stock' : 'out of stock'})
        </Text>
        {loading ? <ActivityIndicator style={styles.loader} color={BRAND_ORANGE} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && rows.length === 0 ? <Text style={styles.empty}>Nothing in this list.</Text> : null}
        {rows.length > 0 ? (
          <View style={styles.listGroupWrap}>
            <FlatList
              style={styles.list}
              data={rows}
              keyExtractor={(r) => r.key}
              contentContainerStyle={styles.listGroupedContent}
              ItemSeparatorComponent={() => <View style={styles.rowSep} />}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.listRow}
                  onPress={() => {
                    const p = item.product;
                    const label =
                      `${(p.brand || '').trim()} ${(p.name || '').trim()}`.trim() || (p.name || '');
                    router.push(
                      `/inventory/${item.subcategoryId}/products/${p.id}?productName=${encodeURIComponent(
                        label,
                      )}`,
                    );
                  }}
                >
                  <View style={styles.listRowBody}>
                    <Text style={styles.cat}>{item.subcategoryName}</Text>
                    <Text style={styles.pname}>
                      {(item.product.brand || '').trim()} {(item.product.name || '').trim()}
                    </Text>
                    <Text style={styles.qty}>{item.product.current_quantity ?? 0} boxes</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}
      </View>
      <DealerTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  body: { flex: 1 },
  pageTitle: {
    fontSize: 22,
    fontFamily: FONT.bold,
    color: SLATE,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  list: { flex: 1 },
  toggleRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  toggleOn: { backgroundColor: '#FFF7ED' },
  toggleText: { fontFamily: FONT.semibold, color: MUTED, fontSize: 14, textAlign: 'center' },
  toggleTextOn: { color: '#C2410C' },
  countLine: { paddingHorizontal: 16, color: MUTED, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  loader: { marginTop: 12 },
  error: { color: '#DC2626', paddingHorizontal: 16, marginBottom: 8 },
  listGroupWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  listGroupedContent: { paddingBottom: 16 },
  rowSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EEF2F7',
    marginLeft: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  listRowBody: { flex: 1, minWidth: 0 },
  cat: { fontSize: 12, color: MUTED, marginBottom: 3, fontFamily: FONT.regular },
  pname: { fontSize: 16, fontFamily: FONT.bold, color: SLATE, lineHeight: 22 },
  qty: { marginTop: 6, fontFamily: FONT.semibold, color: '#DC2626', fontSize: 15 },
  chevron: {
    fontSize: 22,
    color: '#94A3B8',
    fontFamily: FONT.regular,
    paddingLeft: 4,
  },
  empty: { textAlign: 'center', color: MUTED, marginTop: 28, fontSize: 14 },
});
