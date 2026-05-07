import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signUpFormSchema, toFieldErrors } from '@supplysync/core';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { FONT } from '../theme/typography';

const SLATE = '#0F172A';
const MUTED = '#64748B';
const BRAND_ORANGE = '#F97316';

const initialForm = {
  businessName: '',
  ownerName: '',
  mobileNumber: '',
  city: '',
  state: '',
  postalCode: '',
  fullAddress: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function SignUpScreen() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [errorBanner, setErrorBanner] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev?.[key] ? { ...prev, [key]: '' } : prev));
  };

  const validate = () => {
    const res = signUpFormSchema.safeParse(form);
    if (res.success) {
      setErrors({});
      return true;
    }
    setErrors(toFieldErrors(res.error));
    return false;
  };

  const requiredHint = useMemo(
    () => (loading ? 'Please wait…' : 'Fields marked * are required.'),
    [loading],
  );

  const submit = async () => {
    setErrorBanner('');
    if (!validate()) {
      setErrorBanner('Please fix the highlighted fields.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/signup', {
        business_name: form.businessName,
        owner_name: form.ownerName,
        phone: form.mobileNumber,
        city: form.city,
        state: form.state,
        postal_code: form.postalCode,
        address: form.fullAddress?.trim() ? form.fullAddress.trim() : null,
        email: form.email,
        password: form.password,
      });
      router.replace('/login');
    } catch (err) {
      setErrorBanner(err?.response?.data?.detail || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, required, value, onChangeText, placeholder, keyboardType, secureTextEntry, right }) => {
    const showError = Boolean(errors?.[label]);
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>
          {label} {required ? <Text style={styles.req}>*</Text> : null}
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, showError && styles.inputError, right && styles.inputWithRight]}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChangeText}
            editable={!loading}
            keyboardType={keyboardType || 'default'}
            autoCapitalize="none"
            secureTextEntry={secureTextEntry}
          />
          {right}
        </View>
        {showError ? <Text style={styles.fieldError}>{errors[label]}</Text> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backHit} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={SLATE} />
        </Pressable>
        <Text style={styles.topTitle}>Create account</Text>
        <View style={styles.backHit} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>
          Supply<Text style={styles.brandAccent}>Sync</Text>
        </Text>
        <Text style={styles.h1}>Create Dealer Account</Text>
        <Text style={styles.sub}>Join SupplySync and manage your inventory from anywhere.</Text>
        <Text style={styles.hint}>{requiredHint}</Text>

        <View style={styles.card}>
          {errorBanner ? <Text style={styles.errorBanner}>{errorBanner}</Text> : null}

          <Text style={styles.sectionTitle}>Business information</Text>

          <Field
            label="businessName"
            required
            value={form.businessName}
            onChangeText={(v) => update('businessName', v)}
            placeholder="Your Business Name"
          />
          <Field
            label="ownerName"
            required
            value={form.ownerName}
            onChangeText={(v) => update('ownerName', v)}
            placeholder="Owner name"
          />
          <Field
            label="mobileNumber"
            required
            value={form.mobileNumber}
            onChangeText={(v) => update('mobileNumber', v)}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
          />
          <Field
            label="city"
            required
            value={form.city}
            onChangeText={(v) => update('city', v)}
            placeholder="City"
          />
          <Field
            label="state"
            required
            value={form.state}
            onChangeText={(v) => update('state', v)}
            placeholder="State"
          />
          <Field
            label="postalCode"
            required
            value={form.postalCode}
            onChangeText={(v) => update('postalCode', v)}
            placeholder="6-digit PIN"
            keyboardType="number-pad"
          />
          <Field
            label="fullAddress"
            value={form.fullAddress}
            onChangeText={(v) => update('fullAddress', v)}
            placeholder="Full address (optional)"
          />

          <View style={styles.sep} />

          <Text style={styles.sectionTitle}>Login credentials</Text>
          <Field
            label="email"
            required
            value={form.email}
            onChangeText={(v) => update('email', v)}
            placeholder="your.email@example.com"
            keyboardType="email-address"
          />

          <Field
            label="password"
            required
            value={form.password}
            onChangeText={(v) => update('password', v)}
            placeholder="Minimum 8 characters"
            secureTextEntry={!showPass}
            right={
              <Pressable
                style={styles.rightIcon}
                onPress={() => setShowPass((p) => !p)}
                accessibilityLabel={showPass ? 'Hide password' : 'Show password'}
              >
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={MUTED} />
              </Pressable>
            }
          />
          <Field
            label="confirmPassword"
            required
            value={form.confirmPassword}
            onChangeText={(v) => update('confirmPassword', v)}
            placeholder="Re-enter password"
            secureTextEntry={!showConfirm}
            right={
              <Pressable
                style={styles.rightIcon}
                onPress={() => setShowConfirm((p) => !p)}
                accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={MUTED} />
              </Pressable>
            }
          />

          <Pressable style={styles.primaryBtn} disabled={loading} onPress={submit}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.replace('/login')} disabled={loading}>
              <Text style={styles.footerLink}>Login</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7FB' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  backHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: FONT.bold, color: SLATE, fontSize: 16 },
  content: { padding: 16, paddingBottom: 40 },
  brand: { fontSize: 22, fontFamily: FONT.bold, color: SLATE },
  brandAccent: { color: BRAND_ORANGE },
  h1: { marginTop: 10, fontSize: 24, lineHeight: 30, fontFamily: FONT.bold, color: SLATE },
  sub: { marginTop: 6, color: MUTED, lineHeight: 18 },
  hint: { marginTop: 8, color: MUTED, fontSize: 12 },
  card: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  errorBanner: { color: '#DC2626', marginBottom: 10, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontFamily: FONT.bold, color: SLATE, marginTop: 6, marginBottom: 8 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#EEF2F7', marginVertical: 14 },
  fieldGroup: { marginBottom: 12 },
  label: { color: SLATE, fontFamily: FONT.semibold, marginBottom: 6, fontSize: 13 },
  req: { color: '#DC2626' },
  inputRow: { position: 'relative', justifyContent: 'center' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    color: SLATE,
  },
  inputWithRight: { paddingRight: 44 },
  rightIcon: { position: 'absolute', right: 10, height: 40, width: 40, alignItems: 'center', justifyContent: 'center' },
  inputError: { borderColor: '#FCA5A5' },
  fieldError: { marginTop: 6, color: '#DC2626', fontSize: 12 },
  primaryBtn: {
    backgroundColor: BRAND_ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontFamily: FONT.bold, fontSize: 15 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  footerText: { color: MUTED },
  footerLink: { color: BRAND_ORANGE, fontFamily: FONT.semibold },
});

