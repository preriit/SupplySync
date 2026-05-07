import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DealerAppBar } from '../../../components/DealerAppBar';
import { DealerBackButton } from '../../../components/DealerBackButton';
import { DealerMenuSheet } from '../../../components/DealerMenuSheet';
import { DealerTabBar } from '../../../components/DealerTabBar';
import { api } from '../../../lib/api';
import { FONT } from '../../../theme/typography';

const SLATE = '#0F172A';
const MUTED = '#64748B';
const BRAND_ORANGE = '#EA580C';

const STOCK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'in', label: 'In stock' },
  { id: 'low', label: 'Low' },
  { id: 'out', label: 'Out of stock' },
];

const SORT_OPTIONS = [
  { key: 'name', dir: 'asc', label: 'Name (A–Z)' },
  { key: 'name', dir: 'desc', label: 'Name (Z–A)' },
  { key: 'qty', dir: 'desc', label: 'Quantity (high to low)' },
  { key: 'qty', dir: 'asc', label: 'Quantity (low to high)' },
];

function matchesSearch(product, term) {
  if (!term) {
    return true;
  }
  const haystack = `${product.name || ''} ${product.brand || ''} ${product.surface_type || ''}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
}

function stockStatusForQty(qty) {
  const q = Number(qty) || 0;
  if (q === 0) return { label: 'Out of stock', tone: 'danger' };
  if (q > 0 && q < 20) return { label: 'Low stock', tone: 'warning' };
  return { label: 'Healthy', tone: 'healthy' };
}

function isDefaultSort(sortKey, sortDir) {
  return sortKey === 'name' && sortDir === 'asc';
}

/** Expo may pass search params as string or string[] */
function firstParam(value) {
  if (value == null || value === '') return '';
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' ? v : String(v);
}

export default function ProductsScreen() {
  const params = useLocalSearchParams();
  const subcategoryId = firstParam(params.subcategoryId);
  const subcategoryNameHint = firstParam(params.subcategoryName);
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [subcategory, setSubcategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [surfaceFilter, setSurfaceFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [draftStock, setDraftStock] = useState('all');
  const [draftSurface, setDraftSurface] = useState('all');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      setSubcategory(null);
      try {
        const response = await api.get(`/dealer/subcategories/${subcategoryId}/products`);
        if (!mounted) {
          return;
        }
        setSubcategory(response.data?.subcategory || null);
        setProducts(response.data?.products || []);
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err?.response?.data?.detail || 'Failed to load products.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [subcategoryId]);

  const surfaceOptions = useMemo(() => {
    const unique = Array.from(new Set(products.map((item) => item.surface_type).filter(Boolean)));
    return ['all', ...unique];
  }, [products]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (stockFilter !== 'all') n += 1;
    if (surfaceFilter !== 'all') n += 1;
    return n;
  }, [stockFilter, surfaceFilter]);

  const sortIsNonDefault = !isDefaultSort(sortKey, sortDir);

  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim();
    const filtered = products.filter((product) => {
      const qty = Number(product.current_quantity || 0);
      if (stockFilter === 'in' && qty <= 0) return false;
      if (stockFilter === 'low' && !(qty > 0 && qty < 20)) return false;
      if (stockFilter === 'out' && qty !== 0) return false;
      if (surfaceFilter !== 'all' && (product.surface_type || '') !== surfaceFilter) return false;
      return matchesSearch(product, term);
    });
    return [...filtered].sort((a, b) => {
      if (sortKey === 'qty') {
        const qa = Number(a.current_quantity) || 0;
        const qb = Number(b.current_quantity) || 0;
        return sortDir === 'asc' ? qa - qb : qb - qa;
      }
      const na = `${a.name || ''}`.toLowerCase();
      const nb = `${b.name || ''}`.toLowerCase();
      return sortDir === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
    });
  }, [products, searchTerm, stockFilter, surfaceFilter, sortKey, sortDir]);

  const openFilterSheet = () => {
    setDraftStock(stockFilter);
    setDraftSurface(surfaceFilter);
    setSortSheetOpen(false);
    setFilterSheetOpen(true);
  };

  const openSortSheet = () => {
    setFilterSheetOpen(false);
    setSortSheetOpen(true);
  };

  const applyFilterDraft = () => {
    setStockFilter(draftStock);
    setSurfaceFilter(draftSurface);
    setFilterSheetOpen(false);
  };

  const resetFilterDraft = () => {
    setDraftStock('all');
    setDraftSurface('all');
    setStockFilter('all');
    setSurfaceFilter('all');
    setFilterSheetOpen(false);
  };

  const applySortOption = (key, dir) => {
    setSortKey(key);
    setSortDir(dir);
    setSortSheetOpen(false);
  };

  const resolvedSubcategoryTitle = subcategory?.name || subcategoryNameHint;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <View style={styles.bodyFlex}>
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <DealerBackButton />
            <View style={[styles.pageTitleWrap, styles.pageTitleInRow]}>
              {loading && !resolvedSubcategoryTitle ? (
                <View style={styles.titleLoadingSlot}>
                  <ActivityIndicator size="small" color={BRAND_ORANGE} />
                </View>
              ) : (
                <Text style={styles.pageTitleText} numberOfLines={2}>
                  {resolvedSubcategoryTitle || 'Products'}
                </Text>
              )}
            </View>
            <Pressable
              style={styles.iconAdd}
              onPress={() => router.push(`/inventory/${subcategoryId}/products/add`)}
              accessibilityRole="button"
              accessibilityLabel="Add product"
            >
              <Ionicons name="add" size={26} color={BRAND_ORANGE} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Search the list, then use Filter for stock and surface, or Sort to change list order.
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Search by name, brand, or surface"
            placeholderTextColor="#94A3B8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <View style={styles.toolRow}>
          <Pressable
            style={styles.toolPill}
            onPress={openSortSheet}
            accessibilityRole="button"
            accessibilityLabel="Sort products"
          >
            <Ionicons name="swap-vertical-outline" size={18} color={BRAND_ORANGE} />
            <Text style={styles.toolPillText}>Sort</Text>
            {sortIsNonDefault ? (
              <View style={styles.toolBadge}>
                <Text style={styles.toolBadgeText}>1</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            style={styles.toolPill}
            onPress={openFilterSheet}
            accessibilityRole="button"
            accessibilityLabel="Filter products"
          >
            <Ionicons name="funnel-outline" size={18} color={BRAND_ORANGE} />
            <Text style={styles.toolPillText}>Filter</Text>
            {activeFilterCount > 0 ? (
              <View style={styles.toolBadge}>
                <Text style={styles.toolBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {loading ? <ActivityIndicator style={styles.loader} color={BRAND_ORANGE} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && !error ? (
          <Text style={styles.countLine}>
            {visibleProducts.length} of {products.length} product{products.length === 1 ? '' : 's'}
          </Text>
        ) : null}

        {!loading && visibleProducts.length === 0 ? (
          <Text style={styles.empty}>No products match your filters.</Text>
        ) : null}

        {visibleProducts.length > 0 ? (
          <View style={styles.listGroupWrap}>
            <FlatList
              style={styles.listFlex}
              data={visibleProducts}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listGroupedContent}
              ItemSeparatorComponent={() => <View style={styles.rowSep} />}
              renderItem={({ item }) => {
                const status = stockStatusForQty(item.current_quantity);
                const uri = item.primary_image_url ? String(item.primary_image_url).trim() : '';
                return (
                  <Pressable
                    style={styles.listRow}
                    onPress={() =>
                      router.push(
                        `/inventory/${subcategoryId}/products/${item.id}?productName=${encodeURIComponent(
                          item.name || '',
                        )}`,
                      )
                    }
                  >
                    {uri ? (
                      <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Ionicons name="image-outline" size={22} color="#94A3B8" />
                      </View>
                    )}
                    <View style={styles.listRowBody}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {[item.brand, item.surface_type].filter(Boolean).join(' · ') || '—'}
                      </Text>
                      <Text style={styles.rowQty}>{item.current_quantity ?? 0} boxes</Text>
                      <Text
                        style={[
                          styles.rowBadge,
                          status.tone === 'healthy' && styles.rowBadgeHealthy,
                          status.tone === 'warning' && styles.rowBadgeWarning,
                          status.tone === 'danger' && styles.rowBadgeDanger,
                        ]}
                      >
                        {status.label}
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
      <DealerTabBar current="inventory" />

      <Modal
        visible={sortSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSortSheetOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSortSheetOpen(false)} />
          <View style={[styles.modalSheet, styles.modalSheetCompact, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalGrab} />
            <Text style={styles.modalTitle}>Sort by</Text>
            <View>
              {SORT_OPTIONS.map((opt) => {
                const selected = sortKey === opt.key && sortDir === opt.dir;
                return (
                  <Pressable
                    key={`${opt.key}-${opt.dir}`}
                    style={styles.modalRow}
                    onPress={() => applySortOption(opt.key, opt.dir)}
                  >
                    <Text style={styles.modalRowLabel}>{opt.label}</Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={BRAND_ORANGE} />
                    ) : (
                      <View style={styles.radioOuter}>
                        <View style={styles.radioInnerEmpty} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={filterSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterSheetOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setFilterSheetOpen(false)} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalGrab} />
            <Text style={styles.modalTitle}>Filter</Text>

            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalSection}>Stock</Text>
              {STOCK_FILTERS.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.modalRow}
                  onPress={() => setDraftStock(item.id)}
                >
                  <Text style={styles.modalRowLabel}>{item.label}</Text>
                  {draftStock === item.id ? (
                    <Ionicons name="checkmark-circle" size={22} color={BRAND_ORANGE} />
                  ) : (
                    <View style={styles.radioOuter}>
                      <View style={styles.radioInnerEmpty} />
                    </View>
                  )}
                </Pressable>
              ))}

              {surfaceOptions.length > 1 ? (
                <>
                  <Text style={styles.modalSection}>Surface</Text>
                  {surfaceOptions.map((surface) => (
                    <Pressable
                      key={surface}
                      style={styles.modalRow}
                      onPress={() => setDraftSurface(surface)}
                    >
                      <Text style={styles.modalRowLabel} numberOfLines={2}>
                        {surface === 'all' ? 'All surfaces' : surface}
                      </Text>
                      {draftSurface === surface ? (
                        <Ionicons name="checkmark-circle" size={22} color={BRAND_ORANGE} />
                      ) : (
                        <View style={styles.radioOuter}>
                          <View style={styles.radioInnerEmpty} />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnSecondary} onPress={resetFilterDraft}>
                <Text style={styles.modalBtnSecondaryText}>Reset</Text>
              </Pressable>
              <Pressable style={styles.modalBtnPrimary} onPress={applyFilterDraft}>
                <Text style={styles.modalBtnPrimaryText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  bodyFlex: { flex: 1 },
  headerBlock: { paddingHorizontal: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  pageTitleWrap: { minWidth: 0, justifyContent: 'center' },
  pageTitleInRow: { flex: 1 },
  pageTitleText: { fontSize: 22, fontFamily: FONT.bold, color: SLATE },
  titleLoadingSlot: { minHeight: 28, justifyContent: 'center', alignItems: 'flex-start' },
  iconAdd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
    marginBottom: 12,
  },
  searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: SLATE,
    fontSize: 15,
  },
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  toolPillText: { fontSize: 14, fontFamily: FONT.semibold, color: SLATE },
  toolBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: BRAND_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBadgeText: { color: '#FFFFFF', fontSize: 12, fontFamily: FONT.bold },
  loader: { marginTop: 12 },
  errorText: { color: '#DC2626', paddingHorizontal: 16, marginBottom: 8 },
  countLine: {
    paddingHorizontal: 16,
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  empty: { textAlign: 'center', color: MUTED, marginTop: 16, paddingHorizontal: 16, fontSize: 14 },
  listFlex: { flex: 1 },
  listGroupWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    minHeight: 120,
  },
  listGroupedContent: { paddingBottom: 100 },
  rowSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EEF2F7',
    marginLeft: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  thumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontFamily: FONT.bold, color: SLATE, lineHeight: 21 },
  rowMeta: { fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 16 },
  rowQty: { fontSize: 13, fontFamily: FONT.semibold, color: SLATE, marginTop: 4 },
  rowBadge: { fontSize: 12, fontFamily: FONT.semibold, marginTop: 4 },
  rowBadgeHealthy: { color: '#16A34A' },
  rowBadgeWarning: { color: '#EA580C' },
  rowBadgeDanger: { color: '#DC2626' },
  chevron: {
    fontSize: 22,
    color: '#94A3B8',
    fontFamily: FONT.regular,
    paddingLeft: 2,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '88%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    zIndex: 1,
    elevation: 16,
  },
  modalSheetCompact: { maxHeight: '55%' },
  modalGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontFamily: FONT.bold, color: SLATE, marginBottom: 8 },
  modalScroll: { maxHeight: 420 },
  modalSection: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: MUTED,
    marginTop: 12,
    marginBottom: 6,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  modalRowLabel: { flex: 1, fontSize: 15, color: SLATE, fontFamily: FONT.regular },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerEmpty: { width: 10, height: 10, borderRadius: 5 },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 4,
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  modalBtnSecondaryText: { fontFamily: FONT.semibold, color: SLATE, fontSize: 15 },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: BRAND_ORANGE,
    alignItems: 'center',
  },
  modalBtnPrimaryText: { fontFamily: FONT.semibold, color: '#FFFFFF', fontSize: 15 },
});
