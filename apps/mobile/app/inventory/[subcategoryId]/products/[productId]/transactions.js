import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../../../../../components/DealerAppBar';
import { DealerBackButton } from '../../../../../components/DealerBackButton';
import { DealerMenuSheet } from '../../../../../components/DealerMenuSheet';
import { DealerTabBar } from '../../../../../components/DealerTabBar';
import { api } from '../../../../../lib/api';
import { FONT } from '../../../../../theme/typography';

const SLATE = '#0F172A';
const MUTED = '#64748B';
const BRAND_ORANGE = '#EA580C';

function formatTimeAgo(value) {
  if (!value) return 'Just now';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'Just now';
  const diffMs = Date.now() - dt.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return dt.toLocaleDateString();
}

export default function ProductTransactionsScreen() {
  const { subcategoryId, productId } = useLocalSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/dealer/products/${productId}/transactions`);
        if (!mounted) return;
        setItems(data?.transactions || []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load transactions.');
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [productId]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <View style={styles.body}>
      <View style={styles.header}>
        <DealerBackButton />
        <Text style={styles.title}>Transaction history</Text>
      </View>
      <Text style={styles.subtitle}>Last 90 days of stock changes.</Text>

      {loading ? <ActivityIndicator style={styles.loader} color={BRAND_ORANGE} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && items.length === 0 ? <Text style={styles.empty}>No transactions yet.</Text> : null}

      {!loading && items.length > 0 ? (
        <View style={styles.listWrap}>
          <FlatList
            style={styles.listFlex}
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View
                  style={[
                    styles.dot,
                    item.transaction_type === 'add' ? styles.dotAdd : styles.dotSubtract,
                  ]}
                />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>
                    {item.transaction_type === 'add' ? 'Add' : 'Subtract'} {item.quantity} boxes :{' '}
                    {item.quantity_before} → {item.quantity_after}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {formatTimeAgo(item.created_at)}
                    {item.created_by ? ` · ${item.created_by}` : ''}
                  </Text>
                </View>
              </View>
            )}
          />
        </View>
      ) : null}
      </View>
      <DealerTabBar current="inventory" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  body: { flex: 1 },
  listFlex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  title: { flex: 1, fontSize: 22, fontFamily: FONT.bold, color: SLATE, minWidth: 0 },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  loader: { marginTop: 16 },
  error: { color: '#DC2626', paddingHorizontal: 16 },
  empty: { textAlign: 'center', color: MUTED, marginTop: 24, paddingHorizontal: 16 },
  listWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  listContent: { paddingBottom: 100 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#F1F5F9', marginLeft: 34 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  dotAdd: { backgroundColor: '#16A34A' },
  dotSubtract: { backgroundColor: '#DC2626' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontFamily: FONT.semibold, color: SLATE, lineHeight: 20 },
  rowMeta: { fontSize: 12, color: MUTED, marginTop: 4 },
});
