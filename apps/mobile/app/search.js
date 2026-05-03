import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';

export default function SearchScreen() {
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backHit} hitSlop={12}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Search</Text>
        <View style={styles.backHit} />
      </View>
      <View style={styles.searchRow}>
        <TextInput
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
                onPress={() => router.push(`/inventory/${s.id}/products`)}
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
              onPress={() => router.push(`/inventory/${p.subcategory_id}/products/${p.id}`)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backHit: { minWidth: 56, minHeight: 44, justifyContent: 'center' },
  backText: { color: '#EA580C', fontWeight: '700', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
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
  goBtnText: { color: '#FFFFFF', fontWeight: '700' },
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
  cardTag: { fontSize: 11, fontWeight: '700', color: '#EA580C', textTransform: 'uppercase', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardMeta: { fontSize: 14, color: '#64748B', marginTop: 4 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 24 },
});
