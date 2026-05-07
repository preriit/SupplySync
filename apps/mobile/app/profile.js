import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  createAuthHelpers,
  createSessionManager,
  profileFormSchema,
  toFieldErrors,
} from '@supplysync/core';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../components/DealerAppBar';
import { DealerMenuSheet } from '../components/DealerMenuSheet';
import { DealerTabBar } from '../components/DealerTabBar';
import { api } from '../lib/api';
import { secureStorage } from '../lib/storage';
import { FONT } from '../theme/typography';

const BRAND_ORANGE = '#EA580C';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const CARD = '#FFFFFF';

export default function ProfileScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    preferred_language: 'en',
    user_type: '',
    merchant_id: '',
  });
  const [originalData, setOriginalData] = useState(null);
  const [message, setMessage] = useState(null);

  const dealerSessionManager = useMemo(() => createSessionManager(secureStorage), []);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const authHelpers = createAuthHelpers(dealerSessionManager);
      const ok = await authHelpers.isAuthenticated('dealer');
      if (!ok) {
        router.replace('/login');
        return;
      }
      const localUser = await dealerSessionManager.getUser('dealer');
      const response = await api.get('/auth/me');
      const user = response.data || {};
      const next = {
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || localUser.phone || '',
        preferred_language: user.preferred_language || 'en',
        user_type: user.user_type || '',
        merchant_id: user.merchant_id || '',
      };
      setFormData(next);
      setOriginalData(next);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.detail || 'Failed to load profile.',
      });
    } finally {
      setLoading(false);
    }
  }, [dealerSessionManager]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!isEditing) return;
    setMessage(null);
    const validation = profileFormSchema.safeParse({
      username: formData.username,
      phone: formData.phone || '',
      preferred_language: formData.preferred_language,
    });
    if (!validation.success) {
      const fieldErrors = toFieldErrors(validation.error);
      const firstMessage = Object.values(fieldErrors)[0];
      setMessage({
        type: 'error',
        text: firstMessage || 'Please fix the highlighted profile fields.',
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        username: formData.username.trim(),
        phone: (formData.phone || '').trim() || null,
        preferred_language: formData.preferred_language,
      };
      const response = await api.put('/auth/me', payload);
      const updated = response.data || {};

      const token = await dealerSessionManager.getToken('dealer');
      const existingLocal = await dealerSessionManager.getUser('dealer');
      const mergedLocal = {
        ...existingLocal,
        username: updated.username || existingLocal.username,
        preferred_language: updated.preferred_language || existingLocal.preferred_language,
      };
      if (payload.phone) mergedLocal.phone = payload.phone;
      else delete mergedLocal.phone;
      if (token) {
        await dealerSessionManager.setSession({
          token,
          user: mergedLocal,
          scope: 'dealer',
        });
      }

      setFormData((prev) => ({
        ...prev,
        username: updated.username || prev.username,
        phone: updated.phone ?? prev.phone,
        preferred_language: updated.preferred_language || prev.preferred_language,
      }));
      setOriginalData((prev) => ({
        ...(prev || {}),
        username: updated.username || formData.username,
        email: formData.email,
        phone: updated.phone ?? formData.phone,
        preferred_language: updated.preferred_language || formData.preferred_language,
        user_type: formData.user_type,
        merchant_id: formData.merchant_id,
      }));
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      setIsEditing(false);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.detail || 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalData) setFormData(originalData);
    setMessage(null);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await dealerSessionManager.clearSession('dealer');
    router.replace('/login');
  };

  const langLabel = formData.preferred_language === 'hi' ? 'Hindi' : 'English';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>Profile</Text>
          <Text style={styles.screenSub}>Manage your account details.</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account information</Text>

            {loading ? (
              <ActivityIndicator style={styles.loader} color={BRAND_ORANGE} />
            ) : (
              <>
                {message ? (
                  <View
                    style={[
                      styles.banner,
                      message.type === 'error' ? styles.bannerError : styles.bannerOk,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bannerText,
                        message.type === 'error' ? styles.bannerTextError : styles.bannerTextOk,
                      ]}
                    >
                      {message.text}
                    </Text>
                  </View>
                ) : null}

                <Field label="Name">
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={formData.username}
                    onChangeText={(v) => setFormData((p) => ({ ...p, username: v }))}
                    editable={isEditing}
                    placeholder="Your name"
                    placeholderTextColor="#94A3B8"
                  />
                </Field>

                <Field label="Email (read-only)">
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={formData.email}
                    editable={false}
                    placeholderTextColor="#94A3B8"
                  />
                </Field>

                <Field label="Phone">
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={formData.phone}
                    onChangeText={(v) => setFormData((p) => ({ ...p, phone: v }))}
                    editable={isEditing}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </Field>

                <Field label="Preferred language">
                  {isEditing ? (
                    <View style={styles.langRow}>
                      {[
                        { code: 'en', label: 'English' },
                        { code: 'hi', label: 'Hindi' },
                      ].map(({ code, label }) => (
                        <Pressable
                          key={code}
                          style={[
                            styles.langChip,
                            formData.preferred_language === code && styles.langChipOn,
                          ]}
                          onPress={() =>
                            setFormData((p) => ({ ...p, preferred_language: code }))
                          }
                        >
                          <Text
                            style={[
                              styles.langChipText,
                              formData.preferred_language === code && styles.langChipTextOn,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.readOnlyVal}>{langLabel}</Text>
                  )}
                </Field>

                <Field label="User type (read-only)">
                  <Text style={styles.readOnlyVal}>{formData.user_type || 'dealer'}</Text>
                </Field>

                <View style={styles.actions}>
                  {isEditing ? (
                    <>
                      <Pressable
                        style={[styles.primaryBtn, saving && styles.btnDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                      >
                        <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryBtn}
                        onPress={handleCancel}
                        disabled={saving}
                      >
                        <Text style={styles.secondaryBtnText}>Cancel</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable style={styles.primaryBtn} onPress={() => setIsEditing(true)}>
                      <Text style={styles.primaryBtnText}>Edit profile</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>

          <Pressable style={styles.logout} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <DealerTabBar current="profile" />
    </SafeAreaView>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  screenTitle: { fontSize: 22, fontFamily: FONT.bold, color: SLATE },
  screenSub: { fontSize: 14, color: MUTED, marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  cardTitle: { fontSize: 17, fontFamily: FONT.bold, color: SLATE, marginBottom: 12 },
  loader: { marginVertical: 24 },
  banner: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  bannerOk: { backgroundColor: '#ECFDF5' },
  bannerError: { backgroundColor: '#FEF2F2' },
  bannerText: { fontSize: 14, lineHeight: 20 },
  bannerTextOk: { color: '#166534' },
  bannerTextError: { color: '#B91C1C' },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: SLATE,
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: SLATE,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F8FAFC',
    color: '#64748B',
  },
  readOnlyVal: {
    fontSize: 16,
    color: SLATE,
    paddingVertical: 10,
  },
  langRow: { flexDirection: 'row', gap: 10 },
  langChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  langChipOn: { backgroundColor: '#FFF7ED' },
  langChipText: { fontFamily: FONT.semibold, color: '#64748B', fontSize: 15 },
  langChipTextOn: { color: '#C2410C' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  primaryBtn: {
    backgroundColor: BRAND_ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minWidth: 140,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: '#FFFFFF', fontFamily: FONT.bold, fontSize: 16 },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  secondaryBtnText: { color: SLATE, fontFamily: FONT.bold, fontSize: 16 },
  logout: {
    marginTop: 24,
    backgroundColor: SLATE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#FFFFFF', fontFamily: FONT.bold, fontSize: 16 },
});
