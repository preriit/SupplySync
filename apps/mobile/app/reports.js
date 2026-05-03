import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../components/DealerAppBar';
import { DealerMenuSheet } from '../components/DealerMenuSheet';
import { DealerTabBar } from '../components/DealerTabBar';
import { api } from '../lib/api';

/** Same cap as web DealerDashboard "View all" (`products-list?limit=20`). */
const LIST_LIMIT = 20;

const SLATE = '#0F172A';
const MUTED = '#64748B';
const BRAND_ORANGE = '#EA580C';

export default function ReportsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [listType, setListType] = useState('fast_movers');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/dealer/dashboard/products-list', {
        params: { list_type: listType, limit: LIST_LIMIT },
      });
      setItems(data?.items || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load reports.');
      setItems([]);
    }
  }, [listType]);

  useEffect(() => {
    setItems([]);
  }, [listType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openProduct = (subCategoryId, productId) => {
    if (!subCategoryId || !productId) return;
    router.push(`/inventory/${subCategoryId}/products/${productId}`);
  };

  const emptyCopy =
    listType === 'fast_movers' ? 'No movement yet.' : 'No slow-moving stock detected.';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <View style={styles.body}>
        <Text style={styles.pageTitle}>Reports</Text>
        <Text style={styles.subtitle}>
          Fast: top sellers by units out (last 30 days). Slow: in stock, no movement 90+ days.
        </Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggle, listType === 'fast_movers' && styles.toggleOn]}
            onPress={() => setListType('fast_movers')}
            accessibilityRole="tab"
            accessibilityState={{ selected: listType === 'fast_movers' }}
          >
            <Text style={[styles.toggleText, listType === 'fast_movers' && styles.toggleTextOn]}>
              Fast moving
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggle, listType === 'dead_stock' && styles.toggleOn]}
            onPress={() => setListType('dead_stock')}
            accessibilityRole="tab"
            accessibilityState={{ selected: listType === 'dead_stock' }}
          >
            <Text style={[styles.toggleText, listType === 'dead_stock' && styles.toggleTextOn]}>
              Slow moving
            </Text>
          </Pressable>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator style={styles.loader} color={BRAND_ORANGE} />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && items.length === 0 ? (
          <Text style={styles.empty}>{emptyCopy}</Text>
        ) : null}
        {items.length > 0 ? (
          <View style={styles.listGroupWrap}>
            <FlatList
              style={styles.list}
              data={items}
              keyExtractor={(item) => item.product_id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={styles.listGroupedContent}
              ItemSeparatorComponent={() => <View style={styles.rowSep} />}
              renderItem={({ item }) => {
                if (listType === 'fast_movers') {
                  return (
                    <Pressable
                      style={styles.listRow}
                      onPress={() => openProduct(item.sub_category_id, item.product_id)}
                    >
                      <View style={styles.listRowBody}>
                        <Text style={styles.pname} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.meta}>
                          {item.units_moved} sold (last 30 days) · {item.current_stock} in stock
                        </Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  );
                }
                const urgent =
                  item.days_since_movement == null || Number(item.days_since_movement) >= 180;
                return (
                  <Pressable
                    style={styles.listRow}
                    onPress={() => openProduct(item.sub_category_id, item.product_id)}
                  >
                    <View style={styles.listRowBody}>
                      <Text style={styles.pname} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.meta}>
                        Last movement: {item.last_movement}
                        {' · '}
                        <Text style={urgent ? styles.stockUrgent : styles.stockMuted}>
                          {item.current_stock} in stock
                        </Text>
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        ) : null}
      </View>
      <DealerTabBar current="reports" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  body: { flex: 1 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
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
  toggleRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  toggleOn: { backgroundColor: '#FFF7ED' },
  toggleText: { fontWeight: '600', color: '#64748B', fontSize: 14 },
  toggleTextOn: { color: '#C2410C' },
  loader: { marginTop: 16 },
  error: { color: '#DC2626', paddingHorizontal: 16, marginBottom: 8 },
  list: { flex: 1 },
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
  pname: { fontSize: 16, fontWeight: '700', color: SLATE, lineHeight: 22 },
  meta: { marginTop: 6, fontSize: 13, color: MUTED, lineHeight: 18 },
  stockMuted: { color: MUTED },
  stockUrgent: { color: '#B91C1C', fontWeight: '700' },
  chevron: {
    fontSize: 22,
    color: '#94A3B8',
    fontWeight: '300',
    paddingLeft: 4,
  },
  empty: { textAlign: 'center', color: MUTED, marginTop: 32, fontSize: 14 },
});
