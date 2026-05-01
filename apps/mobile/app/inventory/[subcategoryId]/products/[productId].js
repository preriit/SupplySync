import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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

function OptionPicker({ label, value, options, onSelect }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const selected = String(value) === String(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(String(option.id))}
              style={[styles.optionChip, selected ? styles.optionChipActive : null]}
            >
              <Text style={[styles.optionChipText, selected ? styles.optionChipTextActive : null]}>
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function editFormFromProduct(nextProduct) {
  if (!nextProduct) {
    return {
      brand: '',
      name: '',
      sku: '',
      packing_per_box: '',
      surface_type_id: '',
      application_type_id: '',
      body_type_id: '',
      quality_id: '',
    };
  }
  return {
    brand: nextProduct.brand || '',
    name: nextProduct.name || '',
    sku: nextProduct.sku || '',
    packing_per_box: String(nextProduct.packing_per_box || ''),
    surface_type_id: nextProduct.surface_type_id ? String(nextProduct.surface_type_id) : '',
    application_type_id: nextProduct.application_type_id ? String(nextProduct.application_type_id) : '',
    body_type_id: nextProduct.body_type_id ? String(nextProduct.body_type_id) : '',
    quality_id: nextProduct.quality_id ? String(nextProduct.quality_id) : '',
  };
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
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState(editFormFromProduct(null));
  const [surfaceTypes, setSurfaceTypes] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [refsLoading, setRefsLoading] = useState(true);
  const [refsError, setRefsError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [productRes, historyRes] = await Promise.all([
        api.get(`/dealer/products/${productId}`),
        api.get(`/dealer/products/${productId}/transactions`),
      ]);
      const nextProduct = productRes.data?.product || null;
      setProduct(nextProduct);
      setEditForm(editFormFromProduct(nextProduct));
      setHistory(historyRes.data?.transactions || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load product details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadRefs = async () => {
      setRefsError('');
      setRefsLoading(true);
      try {
        const [surfaceRes, appRes, bodyRes, qualityRes] = await Promise.all([
          api.get('/reference/surface-types'),
          api.get('/reference/application-types'),
          api.get('/reference/body-types'),
          api.get('/reference/qualities'),
        ]);
        if (!mounted) return;
        setSurfaceTypes(surfaceRes.data?.surface_types || []);
        setApplicationTypes(appRes.data?.application_types || []);
        setBodyTypes(bodyRes.data?.body_types || []);
        setQualities(qualityRes.data?.qualities || []);
      } catch (err) {
        if (!mounted) return;
        setRefsError(err?.response?.data?.detail || 'Failed to load reference data.');
      } finally {
        if (mounted) {
          setRefsLoading(false);
        }
      }
    };
    loadRefs();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveEdit = async () => {
    if (!product) {
      return;
    }
    if (!editForm.brand.trim() || !editForm.name.trim()) {
      setMessage('Brand and product name are required.');
      return;
    }
    const requiredIds = [
      editForm.surface_type_id,
      editForm.application_type_id,
      editForm.body_type_id,
      editForm.quality_id,
    ];
    if (requiredIds.some((id) => !id)) {
      setMessage('Select surface, application, body type, and quality before saving.');
      return;
    }
    setSavingEdit(true);
    setMessage('');
    try {
      await api.put(`/dealer/products/${productId}`, {
        brand: editForm.brand.trim(),
        name: editForm.name.trim(),
        sku: editForm.sku.trim() || null,
        surface_type_id: editForm.surface_type_id,
        application_type_id: editForm.application_type_id,
        body_type_id: editForm.body_type_id,
        quality_id: editForm.quality_id,
        packing_per_box: Number(editForm.packing_per_box || product.packing_per_box || 1),
      });
      setEditing(false);
      setMessage('Product updated successfully.');
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'Failed to update product.');
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete product', 'Are you sure you want to delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/dealer/products/${productId}`);
            router.replace(`/inventory/${subcategoryId}/products`);
          } catch (err) {
            setMessage(err?.response?.data?.detail || 'Failed to delete product.');
          }
        },
      },
    ]);
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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {refsError ? <Text style={styles.errorText}>{refsError}</Text> : null}
        {refsLoading ? <Text style={styles.cardMeta}>Loading attribute options...</Text> : null}

        {product ? (
        <View style={styles.card}>
          {editing ? (
            <>
              <Text style={styles.sectionTitle}>Edit Product</Text>
              <TextInput
                style={styles.input}
                value={editForm.brand}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, brand: value }))}
                placeholder="Brand"
              />
              <TextInput
                style={styles.input}
                value={editForm.name}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, name: value }))}
                placeholder="Product name"
              />
              <TextInput
                style={styles.input}
                value={editForm.sku}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, sku: value }))}
                placeholder="SKU"
              />
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editForm.packing_per_box}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, packing_per_box: value }))}
                placeholder="Packing per box"
              />
              <OptionPicker
                label="Surface Type"
                value={editForm.surface_type_id}
                options={surfaceTypes}
                onSelect={(v) => setEditForm((prev) => ({ ...prev, surface_type_id: v }))}
              />
              <OptionPicker
                label="Application Type"
                value={editForm.application_type_id}
                options={applicationTypes}
                onSelect={(v) => setEditForm((prev) => ({ ...prev, application_type_id: v }))}
              />
              <OptionPicker
                label="Body Type"
                value={editForm.body_type_id}
                options={bodyTypes}
                onSelect={(v) => setEditForm((prev) => ({ ...prev, body_type_id: v }))}
              />
              <OptionPicker
                label="Quality"
                value={editForm.quality_id}
                options={qualities}
                onSelect={(v) => setEditForm((prev) => ({ ...prev, quality_id: v }))}
              />
              <View style={styles.actions}>
                <Pressable
                  style={styles.addButton}
                  disabled={savingEdit || refsLoading}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.buttonText}>{savingEdit ? 'Saving...' : 'Save Edit'}</Text>
                </Pressable>
                <Pressable
                  style={styles.cancelButton}
                  disabled={savingEdit}
                  onPress={() => {
                    setEditing(false);
                    setEditForm(editFormFromProduct(product));
                    setMessage('');
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.productName}>{product.brand} - {product.name}</Text>
              <Text style={styles.cardMeta}>Current Quantity: {product.current_quantity || 0} boxes</Text>
              <Text style={styles.cardMeta}>Surface: {product.surface_type || '-'}</Text>
              <Text style={styles.cardMeta}>Quality: {product.quality || '-'}</Text>
              <View style={styles.actions}>
                <Pressable style={styles.editButton} onPress={() => setEditing(true)}>
                  <Text style={styles.buttonText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={confirmDelete}>
                  <Text style={styles.buttonText}>Delete</Text>
                </Pressable>
              </View>
            </>
          )}
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
      <View style={styles.listContent}>
        {history.length === 0 ? (
          <Text style={styles.cardMeta}>No transactions yet.</Text>
        ) : (
          history.map((item) => (
            <View key={String(item.id)} style={styles.historyCard}>
              <Text style={styles.historyTitle}>
                {item.transaction_type === 'add' ? '+' : '-'} {item.quantity} boxes
              </Text>
              <Text style={styles.cardMeta}>
                {item.quantity_before} -&gt; {item.quantity_after}
              </Text>
              <Text style={styles.cardMeta}>{item.created_by || 'System'}</Text>
            </View>
          ))
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA', padding: 16 },
  scrollContent: { paddingBottom: 32, gap: 4 },
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
  editButton: { flex: 1, backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  deleteButton: { flex: 1, backgroundColor: '#B91C1C', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelButton: { flex: 1, backgroundColor: '#64748B', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  helperText: { color: '#475569', marginTop: 8 },
  listContent: { paddingBottom: 24, gap: 8 },
  fieldGroup: { gap: 6, marginTop: 10 },
  label: { color: '#0F172A', fontWeight: '600' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  optionChipActive: { borderColor: '#EA580C', backgroundColor: '#FFEDD5' },
  optionChipText: { color: '#334155', fontSize: 12 },
  optionChipTextActive: { color: '#C2410C', fontWeight: '600' },
  historyCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, gap: 4 },
  historyTitle: { color: '#0F172A', fontWeight: '700' },
  errorText: { marginBottom: 10, color: '#DC2626' },
});
