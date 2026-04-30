import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../../lib/api';

function normalizeQty(input) {
  const qty = Number(input);
  if (!Number.isInteger(qty) || qty <= 0) {
    return null;
  }
  return qty;
}

export default function ProductDetailScreen() {
  const { subcategoryId, productId } = useLocalSearchParams();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [quantityInput, setQuantityInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [productRes, historyRes] = await Promise.all([
        api.get(`/dealer/products/${productId}`),
        api.get(`/dealer/products/${productId}/transactions`),
      ]);
      setProduct(productRes.data?.product || null);
      setHistory(historyRes.data?.transactions || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load product details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [productId]);

  const runTransaction = async (transactionType) => {
    const qty = normalizeQty(quantityInput.trim());
    if (!qty) {
      setMessage('Enter a positive whole number.');
      return;
    }
    setUpdating(true);
    setMessage('');
    try {
      const response = await api.post(`/dealer/products/${productId}/transactions`, {
        transaction_type: transactionType,
        quantity: qty,
      });
      const nextQuantity = response.data?.product?.current_quantity;
      setProduct((prev) => (prev ? { ...prev, current_quantity: nextQuantity } : prev));
      setQuantityInput('');
      setMessage(
        transactionType === 'add'
          ? `Added ${qty} boxes successfully.`
          : `Subtracted ${qty} boxes successfully.`
      );
      const historyRes = await api.get(`/dealer/products/${productId}/transactions`);
      setHistory(historyRes.data?.transactions || []);
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'Transaction failed.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.containerCenter}>
        <ActivityIndicator />
        <Text style={styles.helperText}>Loading product detail...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.linkButton} onPress={() => router.push(`/inventory/${subcategoryId}/products`)}>
          <Text style={styles.linkButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Product Detail</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {product ? (
        <View style={styles.card}>
          <Text style={styles.productName}>{product.brand} - {product.name}</Text>
          <Text style={styles.cardMeta}>Current Quantity: {product.current_quantity || 0} boxes</Text>
          <Text style={styles.cardMeta}>Surface: {product.surface_type || '-'}</Text>
          <Text style={styles.cardMeta}>Quality: {product.quality || '-'}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Stock Update</Text>
        <TextInput
          style={styles.input}
          placeholder="Quantity"
          keyboardType="numeric"
          value={quantityInput}
          onChangeText={setQuantityInput}
          editable={!updating}
        />
        <View style={styles.actions}>
          <Pressable style={styles.addButton} onPress={() => runTransaction('add')} disabled={updating}>
            <Text style={styles.buttonText}>+ Add</Text>
          </Pressable>
          <Pressable style={styles.subtractButton} onPress={() => runTransaction('subtract')} disabled={updating}>
            <Text style={styles.buttonText}>- Subtract</Text>
          </Pressable>
        </View>
        {message ? <Text style={styles.helperText}>{message}</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>
              {item.transaction_type === 'add' ? '+' : '-'} {item.quantity} boxes
            </Text>
            <Text style={styles.cardMeta}>
              {item.quantity_before} -> {item.quantity_after}
            </Text>
            <Text style={styles.cardMeta}>{item.created_by || 'System'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.cardMeta}>No transactions yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA', padding: 16 },
  containerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A', flex: 1 },
  linkButton: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  linkButtonText: { color: '#FFFFFF', fontWeight: '600' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, gap: 6, marginBottom: 10 },
  productName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardMeta: { color: '#475569' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addButton: { flex: 1, backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  subtractButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  helperText: { color: '#475569', marginTop: 8 },
  listContent: { paddingBottom: 24, gap: 8 },
  historyCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, gap: 4 },
  historyTitle: { color: '#0F172A', fontWeight: '700' },
  errorText: { marginBottom: 10, color: '#DC2626' },
});
