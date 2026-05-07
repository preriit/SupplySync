import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../../components/DealerAppBar';
import { DealerMenuSheet } from '../../components/DealerMenuSheet';
import { DealerTabBar } from '../../components/DealerTabBar';
import { api } from '../../lib/api';
import { FONT } from '../../theme/typography';

const SLATE = '#0F172A';
const MUTED = '#64748B';

/** Average boxes per product in this subcategory (for health rules). */
function avgBoxesPerProduct(subcategory) {
  const count = Number(subcategory.product_count) || 0;
  if (count <= 0) return null;
  const total = Number(subcategory.total_quantity) || 0;
  return total / count;
}

function getStockLabel(subcategory) {
  if (subcategory.product_count === 0) {
    return 'No products';
  }
  if (subcategory.total_quantity === 0) {
    return 'Out of stock';
  }
  const avg = avgBoxesPerProduct(subcategory);
  if (avg != null && avg < 20) {
    return 'Low stock';
  }
  return 'Healthy';
}

function getStockLabelStyle(subcategory) {
  if (subcategory.product_count === 0) {
    return 'muted';
  }
  if (subcategory.total_quantity === 0) {
    return 'danger';
  }
  const avg = avgBoxesPerProduct(subcategory);
  if (avg != null && avg < 20) {
    return 'warning';
  }
  return 'healthy';
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
        <Text style={styles.subtitle}>Browse categories by size and stock health.</Text>

        {loadingText ? <Text style={styles.loadingText}>{loadingText}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <FlatList
          style={styles.listFlex}
          data={subcategories}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.rowWrap}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const statusTone = getStockLabelStyle(item);
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push(
                    `/inventory/${item.id}/products?subcategoryName=${encodeURIComponent(item.name || '')}`,
                  )
                }
              >
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.size_mm || '-'} | {item.make_type || '-'}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  Products: {item.product_count || 0} | Boxes: {item.total_quantity || 0}
                </Text>
                <Text
                  style={[
                    styles.cardStatus,
                    statusTone === 'healthy' && styles.cardStatusHealthy,
                    statusTone === 'warning' && styles.cardStatusWarning,
                    statusTone === 'danger' && styles.cardStatusDanger,
                    statusTone === 'muted' && styles.cardStatusMuted,
                  ]}
                >
                  {getStockLabel(item)}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={!loadingText && !error ? <Text style={styles.empty}>No categories yet.</Text> : null}
        />
      </View>
      <DealerTabBar current="inventory" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  page: { flex: 1 },
  pageTitle: {
    fontSize: 22,
    fontFamily: FONT.bold,
    color: SLATE,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listFlex: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  rowWrap: { justifyContent: 'space-between', marginBottom: 10 },
  card: {
    width: '48.6%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    minHeight: 132,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 16, fontFamily: FONT.bold, color: '#0F172A' },
  cardMeta: { color: '#475569', fontSize: 12, marginTop: 4 },
  cardStatus: { marginTop: 8, fontFamily: FONT.semibold, fontSize: 14 },
  cardStatusHealthy: { color: '#16A34A' },
  cardStatusWarning: { color: '#EA580C' },
  cardStatusDanger: { color: '#DC2626' },
  cardStatusMuted: { color: MUTED },
  loadingText: { marginTop: 6, color: '#475569', paddingHorizontal: 16 },
  errorText: { marginTop: 6, color: '#DC2626', paddingHorizontal: 16 },
  empty: { textAlign: 'center', color: MUTED, marginTop: 24 },
});
