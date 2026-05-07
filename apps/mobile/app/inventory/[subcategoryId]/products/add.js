import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerBackButton } from '../../../../components/DealerBackButton';
import { api } from '../../../../lib/api';
import { FONT } from '../../../../theme/typography';

const initialForm = {
  brand: '',
  name: '',
  sku: '',
  surface_type_id: '',
  application_type_id: '',
  body_type_id: '',
  quality_id: '',
  current_quantity: '0',
  packing_per_box: '1',
};

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

export default function AddProductScreen() {
  const { subcategoryId } = useLocalSearchParams();
  const [form, setForm] = useState(initialForm);
  const [surfaceTypes, setSurfaceTypes] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadRefs = async () => {
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
        setError(err?.response?.data?.detail || 'Failed to load reference data.');
      }
    };
    loadRefs();
    return () => {
      mounted = false;
    };
  }, []);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.brand.trim() || !form.name.trim()) {
      setError('Brand and product name are required.');
      return;
    }
    const requiredIds = [
      form.surface_type_id,
      form.application_type_id,
      form.body_type_id,
      form.quality_id,
    ];
    if (requiredIds.some((id) => !id)) {
      setError('Select all attribute options before saving.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/dealer/products', {
        sub_category_id: String(subcategoryId),
        brand: form.brand.trim(),
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        surface_type_id: form.surface_type_id,
        application_type_id: form.application_type_id,
        body_type_id: form.body_type_id,
        quality_id: form.quality_id,
        current_quantity: Number(form.current_quantity || 0),
        packing_per_box: Number(form.packing_per_box || 1),
      });
      router.replace(`/inventory/${subcategoryId}/products`);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <DealerBackButton />
        <Text style={styles.title}>Add Product</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Brand</Text>
          <TextInput style={styles.input} value={form.brand} onChangeText={(v) => update('brand', v)} />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(v) => update('name', v)} />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>SKU (optional)</Text>
          <TextInput style={styles.input} value={form.sku} onChangeText={(v) => update('sku', v)} />
        </View>

        <OptionPicker label="Surface Type" value={form.surface_type_id} options={surfaceTypes} onSelect={(v) => update('surface_type_id', v)} />
        <OptionPicker label="Application Type" value={form.application_type_id} options={applicationTypes} onSelect={(v) => update('application_type_id', v)} />
        <OptionPicker label="Body Type" value={form.body_type_id} options={bodyTypes} onSelect={(v) => update('body_type_id', v)} />
        <OptionPicker label="Quality" value={form.quality_id} options={qualities} onSelect={(v) => update('quality_id', v)} />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={form.current_quantity}
              onChangeText={(v) => update('current_quantity', v)}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Packing/Box</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={form.packing_per_box}
              onChangeText={(v) => update('packing_per_box', v)}
            />
          </View>
        </View>

        <Pressable style={styles.saveButton} disabled={saving} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Create Product'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: FONT.bold, color: '#0F172A', minWidth: 0 },
  content: { paddingTop: 16, paddingBottom: 24, gap: 12 },
  fieldGroup: { gap: 6 },
  label: { color: '#0F172A', fontFamily: FONT.semibold },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, gap: 6 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 10, paddingVertical: 6 },
  optionChipActive: { borderColor: '#EA580C', backgroundColor: '#FFEDD5' },
  optionChipText: { color: '#334155', fontSize: 12 },
  optionChipTextActive: { color: '#C2410C', fontFamily: FONT.semibold },
  saveButton: { marginTop: 8, backgroundColor: '#EA580C', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontFamily: FONT.bold },
  errorText: { color: '#DC2626' },
});
