import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../components/DealerAppBar';
import { DealerMenuSheet } from '../components/DealerMenuSheet';
import { DealerTabBar } from '../components/DealerTabBar';
import { api } from '../lib/api';
import { FONT } from '../theme/typography';

const LIST_LIMIT = 25;

const SLATE = '#0F172A';
const MUTED = '#64748B';
const BRAND_ORANGE = '#EA580C';

const REPORT_TYPES = [
  { id: 'fast_moving', label: 'Fast moving', emoji: '🚀' },
  { id: 'slow_moving', label: 'Slow moving', emoji: '🧊' },
  { id: 'overstocked', label: 'Overstocked', emoji: '📦' },
  { id: 'high_momentum', label: 'High momentum', emoji: '🔥' },
];

function formatCreatedShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function avgPerMonth(valuePerDay) {
  const n = Number(valuePerDay);
  if (!Number.isFinite(n)) return 0;
  return n * 30;
}

const TILE_GRID_PAD = 16;
const TILE_GAP = 8;

function splitBrandFromLabel(item) {
  const rawName = `${item?.name || item?.product_name || 'Product'}`.trim();
  const brand = `${item?.brand || ''}`.trim();
  if (!brand) return { name: rawName, brand: '' };
  const re = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
  return { name: rawName.replace(re, '').trim() || rawName, brand };
}

function sizeForDisplay(item) {
  return `${item?.display_size || item?.size_inches || item?.size_mm || '-'}`.trim();
}

export default function ReportsScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [listType, setListType] = useState('fast_moving');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const usableWidth = windowWidth - TILE_GRID_PAD * 2;
  const pillWidth = Math.max(0, Math.floor((usableWidth - TILE_GAP) / 2));

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

  const openProduct = (subCategoryId, productId, productName = '') => {
    if (!subCategoryId || !productId) return;
    router.push(
      `/inventory/${subCategoryId}/products/${productId}?productName=${encodeURIComponent(productName || '')}`,
    );
  };

  const emptyCopy = {
    fast_moving: 'No products meet the fast-moving criteria yet.',
    slow_moving: 'No slow-moving products match these rules.',
    overstocked: 'No overstocked products right now.',
    high_momentum: 'No high-momentum products yet.',
  };

  const renderRow = ({ item }) => {
    const labelParts = splitBrandFromLabel(item);
    const name = labelParts.name || 'Product';
    const brand = labelParts.brand;
    const sizeText = sizeForDisplay(item);
    const subId = item.sub_category_id;
    const pid = item.product_id;
    const onRow = () => openProduct(subId, pid, item.name || item.product_name || name);

    if (listType === 'fast_moving') {
      return (
        <Pressable style={[styles.listRow, styles.listRowFast]} onPress={onRow}>
          <View style={styles.listRowBody}>
            <Text style={styles.pname} numberOfLines={2}>
              {name}
            </Text>
            <Text style={styles.brandMeta} numberOfLines={1}>
              {(brand || '-') + ' · ' + sizeText}
            </Text>
            <Text style={[styles.meta, styles.metaFast]}>
              Sold {item.sold_last_30_days ?? 0} boxes (last 30 days) · Current stock:{' '}
              {item.current_stock_boxes ?? item.current_stock ?? 0} boxes
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      );
    }

    if (listType === 'slow_moving') {
      const days = item.days_since_last_sale ?? item.days_since_movement ?? 0;
      const bucketLabel = item.slow_bucket ? `${item.slow_bucket} days without a sale` : `Last sale ${days} days ago`;
      return (
        <Pressable style={styles.listRow} onPress={onRow}>
          <View style={styles.listRowBody}>
            <Text style={styles.pname} numberOfLines={2}>
              {name}
            </Text>
            <Text style={styles.brandMeta} numberOfLines={1}>
              {(brand || '-') + ' · ' + sizeText}
            </Text>
            <Text style={styles.meta}>
              {bucketLabel} · Current stock: {item.current_stock_boxes ?? item.current_stock ?? 0} boxes
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      );
    }

    if (listType === 'overstocked') {
      return (
        <Pressable style={styles.listRow} onPress={onRow}>
          <View style={styles.listRowBody}>
            <Text style={styles.pname} numberOfLines={2}>
              {name}
            </Text>
            <Text style={styles.brandMeta} numberOfLines={1}>
              {(brand || '-') + ' · ' + sizeText}
            </Text>
            <Text style={styles.meta}>
              Stock: {item.current_stock_boxes ?? 0} boxes · Sold last 30 days: {item.sold_last_30_days ?? 0} boxes
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      );
    }

    /* high_momentum */
    const avgMonth = avgPerMonth(item.lifetime_avg_per_day);
    return (
      <Pressable style={styles.listRow} onPress={onRow}>
        <View style={styles.listRowBody}>
          <Text style={styles.pname} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.brandMeta} numberOfLines={1}>
            {(brand || '-') + ' · ' + sizeText}
          </Text>
          <Text style={styles.meta}>
            Total sold: {item.total_sold_boxes ?? 0} boxes · Active since: {formatCreatedShort(item.created_date)}
          </Text>
          <Text style={styles.metaSecond}>
            Lifetime avg: {avgMonth.toFixed(1)} boxes/month · Last 30d: {item.sold_last_30_days ?? 0} boxes
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <View style={styles.body}>
        <Text style={styles.pageTitle}>Reports</Text>
        <Text style={styles.subtitle}>Decision-focused stock views. Tap a product to open it in inventory.</Text>

        <View
          style={[styles.tileGrid, { paddingHorizontal: TILE_GRID_PAD, gap: TILE_GAP }]}
          accessibilityRole="tablist"
        >
          {REPORT_TYPES.map((r) => {
            const selected = listType === r.id;
            return (
              <Pressable
                key={r.id}
                style={[
                  styles.reportPill,
                  { width: pillWidth },
                  selected ? styles.reportPillSelected : styles.reportPillIdle,
                ]}
                onPress={() => setListType(r.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${r.label}. ${selected ? 'Selected' : 'Not selected'}`}
              >
                <Text style={styles.reportPillEmoji} accessibilityElementsHidden>
                  {r.emoji}
                </Text>
                <Text
                  style={[styles.reportPillLabel, selected && styles.reportPillLabelSelected]}
                  numberOfLines={1}
                >
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading && !refreshing ? <ActivityIndicator style={styles.loader} color={BRAND_ORANGE} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && items.length === 0 ? (
          <Text style={styles.empty}>{emptyCopy[listType] || 'Nothing to show.'}</Text>
        ) : null}
        {items.length > 0 ? (
          <View style={styles.listGroupWrap}>
            <FlatList
              style={styles.list}
              data={items}
              keyExtractor={(item) => String(item.product_id)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={styles.listGroupedContent}
              ItemSeparatorComponent={() => <View style={styles.rowSep} />}
              renderItem={renderRow}
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
    marginBottom: 6,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  reportPill: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reportPillIdle: {
    borderColor: '#E2E8F0',
  },
  reportPillSelected: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FB923C',
    borderWidth: 1.5,
  },
  reportPillEmoji: {
    fontSize: 16,
    lineHeight: 18,
  },
  reportPillLabel: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 15,
  },
  reportPillLabelSelected: {
    color: '#9A3412',
    fontFamily: FONT.bold,
  },
  loader: { marginTop: 8 },
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
  listRowFast: {
    paddingVertical: 11,
  },
  listRowBody: { flex: 1, minWidth: 0 },
  pname: { fontSize: 16, fontFamily: FONT.bold, color: SLATE, lineHeight: 22 },
  brandMeta: { marginTop: 2, fontSize: 12, color: MUTED, lineHeight: 16 },
  meta: { marginTop: 6, fontSize: 13, color: MUTED, lineHeight: 18 },
  metaFast: { marginTop: 4, lineHeight: 17 },
  metaSecond: { marginTop: 4, fontSize: 12, color: MUTED, lineHeight: 16 },
  chevron: {
    fontSize: 22,
    color: '#94A3B8',
    fontFamily: FONT.regular,
    paddingLeft: 4,
  },
  empty: { textAlign: 'center', color: MUTED, marginTop: 32, fontSize: 14, paddingHorizontal: 16 },
});
