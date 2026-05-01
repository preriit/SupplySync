import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';

function matchesSearch(product, term) {
  if (!term) {
    return true;
  }
  const haystack = `${product.name || ''} ${product.brand || ''} ${product.surface_type || ''}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
}

export default function ProductsScreen() {
  const { subcategoryId } = useLocalSearchParams();
  const [subcategory, setSubcategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [surfaceFilter, setSurfaceFilter] = useState('all');
  const [loadingText, setLoadingText] = useState('Loading products...');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await api.get(`/dealer/subcategories/${subcategoryId}/products`);
        if (!mounted) {
          return;
        }
        setSubcategory(response.data?.subcategory || null);
        setProducts(response.data?.products || []);
        setLoadingText('');
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err?.response?.data?.detail || 'Failed to load products.');
        setLoadingText('');
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

  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim();
    return products.filter((product) => {
      const qty = Number(product.current_quantity || 0);
      if (stockFilter === 'in' && qty <= 0) return false;
      if (stockFilter === 'low' && !(qty > 0 && qty < 20)) return false;
      if (stockFilter === 'out' && qty !== 0) return false;
      if (surfaceFilter !== 'all' && (product.surface_type || '') !== surfaceFilter) return false;
      return matchesSearch(product, term);
    });
  }, [products, searchTerm, stockFilter, surfaceFilter]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.linkButton} onPress={() => router.back()}>
          <Text style={styles.linkButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>{subcategory?.name || 'Products'}</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push(`/inventory/${subcategoryId}/products/add`)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search products by name or brand"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <View style={styles.filterRow}>
        {[
          { id: 'all', label: 'All' },
          { id: 'in', label: 'In Stock' },
          { id: 'low', label: 'Low' },
          { id: 'out', label: 'Out' },
        ].map((item) => (
          <Pressable
            key={item.id}
            style={[styles.filterChip, stockFilter === item.id ? styles.filterChipActive : null]}
            onPress={() => setStockFilter(item.id)}
          >
            <Text style={[styles.filterChipText, stockFilter === item.id ? styles.filterChipTextActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.filterRow}>
        {surfaceOptions.map((surface) => (
          <Pressable
            key={surface}
            style={[styles.filterChip, surfaceFilter === surface ? styles.filterChipActive : null]}
            onPress={() => setSurfaceFilter(surface)}
          >
            <Text style={[styles.filterChipText, surfaceFilter === surface ? styles.filterChipTextActive : null]}>
              {surface === 'all' ? 'Surface: All' : surface}
            </Text>
          </Pressable>
        ))}
      </View>

      {loadingText ? <Text style={styles.loadingText}>{loadingText}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/inventory/${subcategoryId}/products/${item.id}`)}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>Brand: {item.brand || '-'}</Text>
            <Text style={styles.cardMeta}>
              Qty: {item.current_quantity || 0} | Surface: {item.surface_type || '-'}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={!loadingText && !error ? <Text>No products found.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA', padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A', flex: 1 },
  linkButton: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  linkButtonText: { color: '#FFFFFF', fontWeight: '600' },
  addButton: { backgroundColor: '#EA580C', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#FFFFFF', fontWeight: '700' },
  filterRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFEDD5',
  },
  filterChipText: { color: '#334155', fontSize: 12 },
  filterChipTextActive: { color: '#C2410C', fontWeight: '700' },
  search: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listContent: { paddingTop: 14, paddingBottom: 24, gap: 10 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardMeta: { color: '#475569' },
  loadingText: { marginTop: 14, color: '#475569' },
  errorText: { marginTop: 10, color: '#DC2626' },
});
