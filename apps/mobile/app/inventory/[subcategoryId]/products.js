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

  const visibleProducts = useMemo(
    () => products.filter((product) => matchesSearch(product, searchTerm.trim())),
    [products, searchTerm]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.linkButton} onPress={() => router.back()}>
          <Text style={styles.linkButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>{subcategory?.name || 'Products'}</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search products by name or brand"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

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
