import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../components/DealerAppBar';
import { DealerMenuSheet } from '../components/DealerMenuSheet';
import { DealerStackHeader } from '../components/DealerStackHeader';
import { api } from '../lib/api';
import { FONT } from '../theme/typography';

export default function SearchScreen() {
  const inputRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { q: qParam } = useLocalSearchParams();
  const initial = typeof qParam === 'string' ? qParam : Array.isArray(qParam) ? qParam[0] || '' : '';
  const [query, setQuery] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);

  const runSearch = useCallback(async (raw) => {
    const trimmed = (raw || '').trim();
    if (trimmed.length < 2) {
      setSubcategories([]);
      setProducts([]);
      setError(trimmed.length ? 'Type at least 2 characters.' : '');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/dealer/search', { params: { q: trimmed } });
      setSubcategories(data?.subcategories || []);
      setProducts(data?.products || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Search failed.');
      setSubcategories([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(initial);
    runSearch(initial);
  }, [initial, runSearch]);

  const rows = [
    ...subcategories.map((s) => ({ kind: 'subcategory', key: `s-${s.id}`, item: s })),
    ...products.map((p) => ({ kind: 'product', key: `p-${p.id}`, item: p })),
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar
        onMenuPress={() => setMenuOpen(true)}
        rightAction="search"
        onSearchPress={() => inputRef.current?.focus()}
      />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <DealerStackHeader title="Search" />
      <View style={styles.searchRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Name, SKU, size…"
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => runSearch(query)}
        />
        <Pressable style={styles.goBtn} onPress={() => runSearch(query)}>
          <Text style={styles.goBtnText}>Go</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator style={styles.loader} color="#EA580C" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        style={styles.listFlex}
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.listPad}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && query.trim().length >= 2 ? (
            <Text style={styles.empty}>No matches.</Text>
          ) : null
        }
        renderItem={({ item: row }) => {
          if (row.kind === 'subcategory') {
            const s = row.item;
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push(
                    `/inventory/${s.id}/products?subcategoryName=${encodeURIComponent(s.name || '')}`,
                  )
                }
              >
                <Text style={styles.cardTag}>Category</Text>
                <Text style={styles.cardTitle}>{s.name}</Text>
                <Text style={styles.cardMeta}>
                  {s.size_display || s.size || ''} · {s.product_count || 0} products
                </Text>
              </Pressable>
            );
          }
          const p = row.item;
          return (
            <Pressable
              style={styles.card}
              onPress={() => {
                const label = `${(p.brand || '').trim()} ${(p.name || '').trim()}`.trim() || (p.name || '');
                router.push(
                  `/inventory/${p.subcategory_id}/products/${p.id}?productName=${encodeURIComponent(label)}`,
                );
              }}
            >
              <Text style={styles.cardTag}>Product</Text>
              <Text style={styles.cardTitle}>
                {(p.brand || '').trim()} {(p.name || '').trim()}
              </Text>
              <Text style={styles.cardMeta}>
                {p.subcategory_name || ''} · {p.current_quantity ?? 0} boxes
              </Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  listFlex: { flex: 1 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  goBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minHeight: 44,
  },
  goBtnText: { color: '#FFFFFF', fontFamily: FONT.bold },
  loader: { marginTop: 12 },
  error: { color: '#DC2626', paddingHorizontal: 16, marginBottom: 8 },
  listPad: { padding: 16, paddingBottom: 32, gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  cardTag: { fontSize: 11, fontFamily: FONT.bold, color: '#EA580C', textTransform: 'uppercase', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontFamily: FONT.bold, color: '#0F172A' },
  cardMeta: { fontSize: 14, color: '#64748B', marginTop: 4 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 24 },
});
