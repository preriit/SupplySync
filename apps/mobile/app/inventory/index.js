import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../../components/DealerAppBar';
import { DealerMenuSheet } from '../../components/DealerMenuSheet';
import { DealerTabBar } from '../../components/DealerTabBar';
import { api } from '../../lib/api';

function getStockLabel(subcategory) {
  if (subcategory.product_count === 0) {
    return 'No products';
  }
  if (subcategory.total_quantity === 0) {
    return 'Out of stock';
  }
  if (subcategory.total_quantity < 20) {
    return 'Low stock';
  }
  return 'Healthy';
}

export default function InventoryScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingText, setLoadingText] = useState('Loading inventory...');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await api.get('/dealer/subcategories');
        if (!mounted) {
          return;
        }
        setSubcategories(response.data?.subcategories || []);
        setLoadingText('');
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err?.response?.data?.detail || 'Failed to load inventory categories.');
        setLoadingText('');
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <View style={styles.page}>
        <Text style={styles.pageTitle}>Inventory</Text>

      {loadingText ? <Text style={styles.loadingText}>{loadingText}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        style={styles.listFlex}
        data={subcategories}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/inventory/${item.id}/products`)}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.size_mm || '-'} | {item.make_type || '-'}
            </Text>
            <Text style={styles.cardMeta}>
              Products: {item.product_count || 0} | Boxes: {item.total_quantity || 0}
            </Text>
            <Text style={styles.cardStatus}>{getStockLabel(item)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={!loadingText && !error ? <Text>No categories yet.</Text> : null}
      />
      </View>
      <DealerTabBar current="inventory" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  page: { flex: 1, paddingHorizontal: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 12, marginBottom: 8 },
  listFlex: { flex: 1 },
  listContent: { paddingTop: 16, paddingBottom: 100, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardMeta: { color: '#475569' },
  cardStatus: { marginTop: 4, color: '#F97316', fontWeight: '600' },
  loadingText: { marginTop: 14, color: '#475569' },
  errorText: { marginTop: 10, color: '#DC2626' },
});
