import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { createAuthHelpers, createSessionManager } from '@supplysync/core';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../components/DealerAppBar';
import { DealerMenuSheet } from '../components/DealerMenuSheet';
import { DealerStackHeader } from '../components/DealerStackHeader';
import { api } from '../lib/api';
import { secureStorage } from '../lib/storage';
import { FONT } from '../theme/typography';

const BRAND_ORANGE = '#EA580C';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const CARD = '#FFFFFF';

function randomPassword() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

function getErrorDetail(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    const msg = detail.trim();
    if (msg.toLowerCase().includes('value is not a valid email address')) {
      return 'Please enter a valid email address or leave Email blank.';
    }
    return msg;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const combined = detail.map((item) => item?.msg || '').filter(Boolean).join(', ');
    return combined || fallback;
  }
  if (error?.message === 'Network Error') {
    return 'Could not connect to server. Check backend and try again.';
  }
  return fallback;
}

const INITIAL_CREATE = { name: '', email: '', phone: '', user_type: 'staff' };
const INITIAL_EDIT = {
  name: '',
  email: '',
  phone: '',
  user_type: 'staff',
  is_active: true,
};

export default function TeamMembersScreen() {
  const dealerSessionManager = useMemo(() => createSessionManager(secureStorage), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gateReady, setGateReady] = useState(false);

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [listError, setListError] = useState('');
  const [section, setSection] = useState('active');

  const [createForm, setCreateForm] = useState(INITIAL_CREATE);
  const [createSaving, setCreateSaving] = useState(false);
  const [createOtpRequested, setCreateOtpRequested] = useState(false);
  const [createRequestId, setCreateRequestId] = useState('');
  const [createOtp, setCreateOtp] = useState('');
  const [createPayload, setCreatePayload] = useState(null);
  const [createCooldown, setCreateCooldown] = useState(0);
  const [createMessage, setCreateMessage] = useState('');
  const [createDevOtp, setCreateDevOtp] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(INITIAL_EDIT);
  const [editSaving, setEditSaving] = useState(false);
  const [editOtpRequested, setEditOtpRequested] = useState(false);
  const [editRequestId, setEditRequestId] = useState('');
  const [editOtp, setEditOtp] = useState('');
  const [editCooldown, setEditCooldown] = useState(0);
  const [editDevOtp, setEditDevOtp] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const auth = createAuthHelpers(dealerSessionManager);
      if (!(await auth.isAuthenticated('dealer'))) {
        router.replace('/login');
        return;
      }
      const user = await dealerSessionManager.getUser('dealer');
      if (user?.user_type !== 'dealer') {
        router.replace('/dashboard');
        return;
      }
      if (!cancelled) setGateReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [dealerSessionManager]);

  const fetchMembers = useCallback(async () => {
    setListError('');
    try {
      const { data } = await api.get('/dealer/team-members');
      setMembers(data?.team_members || []);
    } catch (err) {
      setListError(getErrorDetail(err, 'Failed to load team members.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gateReady) return;
    fetchMembers();
  }, [gateReady, fetchMembers]);

  useEffect(() => {
    if (createCooldown <= 0) return undefined;
    const t = setInterval(() => setCreateCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [createCooldown]);

  useEffect(() => {
    if (editCooldown <= 0) return undefined;
    const t = setInterval(() => setEditCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [editCooldown]);

  const visibleMembers = useMemo(() => {
    if (section === 'inactive') return members.filter((m) => !m.is_active);
    if (section === 'all') return members;
    return members.filter((m) => m.is_active);
  }, [members, section]);

  const resetCreateFlow = () => {
    setCreateForm(INITIAL_CREATE);
    setCreateOtpRequested(false);
    setCreateRequestId('');
    setCreateOtp('');
    setCreatePayload(null);
    setCreateCooldown(0);
    setCreateMessage('');
    setCreateDevOtp('');
  };

  const submitCreate = async () => {
    setCreateMessage('');
    const trimmedName = createForm.name?.trim();
    const trimmedPhone = createForm.phone?.trim();
    if (!trimmedName) {
      setCreateMessage('Please enter a name.');
      return;
    }
    if (!trimmedPhone) {
      setCreateMessage('Please enter a mobile number.');
      return;
    }

    const payload = {
      name: trimmedName,
      username: trimmedPhone,
      email: createForm.email?.trim() || null,
      phone: trimmedPhone,
      password: randomPassword(),
      user_type: createForm.user_type === 'manager' ? 'manager' : 'staff',
    };

    setCreateSaving(true);
    try {
      if (!createOtpRequested) {
        const response = await api.post('/dealer/team-members/request-create', payload);
        setCreatePayload(payload);
        setCreateOtpRequested(true);
        setCreateRequestId(response.data?.request_id || '');
        setCreateCooldown(Number(response.data?.cooldown_seconds) || 30);
        setCreateDevOtp(response.data?.dev_only_otp || '');
        setCreateMessage('OTP sent to your merchant mobile. Enter it below to finish.');
      } else {
        if (!createOtp.trim()) {
          setCreateMessage('Enter the approval OTP.');
          return;
        }
        await api.post('/dealer/team-members/confirm-create', {
          request_id: createRequestId,
          otp: createOtp.trim(),
        });
        resetCreateFlow();
        fetchMembers();
        setCreateMessage('Team member added.');
      }
    } catch (err) {
      const msg = getErrorDetail(err, 'Something went wrong. Try again.');
      setCreateMessage(msg);
    } finally {
      setCreateSaving(false);
    }
  };

  const resendCreateOtp = async () => {
    if (!createPayload || createCooldown > 0) return;
    setCreateSaving(true);
    try {
      const response = await api.post('/dealer/team-members/request-create', createPayload);
      setCreateRequestId(response.data?.request_id || '');
      setCreateCooldown(Number(response.data?.cooldown_seconds) || 30);
      setCreateDevOtp(response.data?.dev_only_otp || '');
      setCreateMessage('OTP resent. Use the latest code.');
    } catch (err) {
      setCreateMessage(getErrorDetail(err, 'Failed to resend OTP.'));
    } finally {
      setCreateSaving(false);
    }
  };

  const startEdit = (member) => {
    setEditError('');
    setEditingId(member.id);
    setEditOtpRequested(false);
    setEditRequestId('');
    setEditOtp('');
    setEditCooldown(0);
    setEditDevOtp('');
    setEditForm({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      user_type: member.user_type === 'manager' ? 'manager' : 'staff',
      is_active: Boolean(member.is_active),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(INITIAL_EDIT);
    setEditOtpRequested(false);
    setEditRequestId('');
    setEditOtp('');
    setEditCooldown(0);
    setEditDevOtp('');
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditError('');
    const trimmedName = editForm.name?.trim();
    const trimmedPhone = editForm.phone?.trim();
    const role = editForm.user_type === 'manager' ? 'manager' : 'staff';

    if (!trimmedName || !trimmedPhone) {
      setEditError('Name and mobile number are required.');
      return;
    }

    const payload = {
      name: trimmedName,
      username: trimmedPhone,
      email: editForm.email?.trim() || null,
      phone: trimmedPhone,
      user_type: role,
      is_active: editForm.is_active,
    };

    setEditSaving(true);
    try {
      if (!editOtpRequested) {
        const response = await api.post('/dealer/team-members/request-update', {
          member_id: editingId,
          ...payload,
        });
        setEditOtpRequested(true);
        setEditRequestId(response.data?.request_id || '');
        setEditCooldown(Number(response.data?.cooldown_seconds) || 30);
        setEditDevOtp(response.data?.dev_only_otp || '');
      } else {
        if (!editOtp.trim()) {
          setEditError('Enter the approval OTP.');
          return;
        }
        await api.post('/dealer/team-members/confirm-update', {
          request_id: editRequestId,
          otp: editOtp.trim(),
        });
        cancelEdit();
        fetchMembers();
      }
    } catch (err) {
      setEditError(getErrorDetail(err, 'Update failed. Try again.'));
    } finally {
      setEditSaving(false);
    }
  };

  const resendEditOtp = async () => {
    if (!editingId || editCooldown > 0) return;
    const trimmedName = editForm.name?.trim();
    const trimmedPhone = editForm.phone?.trim();
    const role = editForm.user_type === 'manager' ? 'manager' : 'staff';
    if (!trimmedName || !trimmedPhone) return;

    setEditSaving(true);
    try {
      const response = await api.post('/dealer/team-members/request-update', {
        member_id: editingId,
        name: trimmedName,
        username: trimmedPhone,
        email: editForm.email?.trim() || null,
        phone: trimmedPhone,
        user_type: role,
        is_active: editForm.is_active,
      });
      setEditRequestId(response.data?.request_id || '');
      setEditCooldown(Number(response.data?.cooldown_seconds) || 30);
      setEditDevOtp(response.data?.dev_only_otp || '');
    } catch (err) {
      setEditError(getErrorDetail(err, 'Failed to resend OTP.'));
    } finally {
      setEditSaving(false);
    }
  };

  if (!gateReady) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ marginTop: 40 }} color={BRAND_ORANGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <DealerStackHeader title="Team Members" />

      {loading ? (
        <ActivityIndicator style={styles.loader} color={BRAND_ORANGE} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>Add and manage staff for your merchant (OTP approval).</Text>

          {listError ? <Text style={styles.bannerErr}>{listError}</Text> : null}

          {editingId ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Edit member</Text>
              {editError ? <Text style={styles.fieldErr}>{editError}</Text> : null}
              <FieldLabel>Name</FieldLabel>
              <TextInput
                style={styles.input}
                value={editForm.name}
                onChangeText={(v) => setEditForm((p) => ({ ...p, name: v }))}
              />
              <FieldLabel>Email</FieldLabel>
              <TextInput
                style={styles.input}
                value={editForm.email}
                onChangeText={(v) => setEditForm((p) => ({ ...p, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FieldLabel>Mobile</FieldLabel>
              <TextInput
                style={styles.input}
                value={editForm.phone}
                onChangeText={(v) => setEditForm((p) => ({ ...p, phone: v }))}
                keyboardType="phone-pad"
              />
              <FieldLabel>Role</FieldLabel>
              <RolePicker
                value={editForm.user_type}
                onChange={(user_type) => setEditForm((p) => ({ ...p, user_type }))}
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch
                  value={editForm.is_active}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, is_active: v }))}
                  trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                  thumbColor={editForm.is_active ? BRAND_ORANGE : '#f4f3f4'}
                />
              </View>

              {editOtpRequested ? (
                <>
                  <FieldLabel>Approval OTP</FieldLabel>
                  <TextInput
                    style={styles.input}
                    value={editOtp}
                    onChangeText={setEditOtp}
                    keyboardType="number-pad"
                    placeholder="Enter OTP"
                  />
                  {editDevOtp ? (
                    <Text style={styles.devOtp}>Dev OTP: {editDevOtp}</Text>
                  ) : null}
                  <Pressable
                    style={[styles.secondaryBtn, editCooldown > 0 && styles.btnDisabled]}
                    onPress={resendEditOtp}
                    disabled={editCooldown > 0 || editSaving}
                  >
                    <Text style={styles.secondaryBtnText}>
                      {editCooldown > 0 ? `Resend OTP (${editCooldown}s)` : 'Resend OTP'}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              <View style={styles.rowBtns}>
                <Pressable style={styles.secondaryBtn} onPress={cancelEdit}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, editSaving && styles.btnDisabled]}
                  onPress={saveEdit}
                  disabled={editSaving}
                >
                  <Text style={styles.primaryBtnText}>
                    {editSaving ? '…' : editOtpRequested ? 'Verify OTP' : 'Send OTP'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add team member</Text>
            {createMessage ? (
              <Text style={createMessage.includes('wrong') || createMessage.includes('Failed') ? styles.fieldErr : styles.infoText}>
                {createMessage}
              </Text>
            ) : null}

            <FieldLabel>Name</FieldLabel>
            <TextInput
              style={styles.input}
              value={createForm.name}
              onChangeText={(v) => setCreateForm((p) => ({ ...p, name: v }))}
            />
            <FieldLabel>Email (optional)</FieldLabel>
            <TextInput
              style={styles.input}
              value={createForm.email}
              onChangeText={(v) => setCreateForm((p) => ({ ...p, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FieldLabel>Mobile</FieldLabel>
            <TextInput
              style={styles.input}
              value={createForm.phone}
              onChangeText={(v) => setCreateForm((p) => ({ ...p, phone: v }))}
              keyboardType="phone-pad"
            />
            <FieldLabel>Role</FieldLabel>
            <RolePicker
              value={createForm.user_type}
              onChange={(user_type) => setCreateForm((p) => ({ ...p, user_type }))}
            />

            {createOtpRequested ? (
              <>
                <FieldLabel>Approval OTP</FieldLabel>
                <TextInput
                  style={styles.input}
                  value={createOtp}
                  onChangeText={setCreateOtp}
                  keyboardType="number-pad"
                  placeholder="Enter OTP"
                />
                {createDevOtp ? <Text style={styles.devOtp}>Dev OTP: {createDevOtp}</Text> : null}
                <Pressable
                  style={[styles.secondaryBtn, createCooldown > 0 && styles.btnDisabled]}
                  onPress={resendCreateOtp}
                  disabled={createCooldown > 0 || createSaving}
                >
                  <Text style={styles.secondaryBtnText}>
                    {createCooldown > 0 ? `Resend OTP (${createCooldown}s)` : 'Resend OTP'}
                  </Text>
                </Pressable>
              </>
            ) : null}

            <Pressable
              style={[styles.primaryBtn, { marginTop: 12 }, createSaving && styles.btnDisabled]}
              onPress={submitCreate}
              disabled={createSaving}
            >
              <Text style={styles.primaryBtnText}>
                {createSaving ? '…' : createOtpRequested ? 'Verify & add' : 'Send OTP'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.toggleRow}>
            {(['active', 'inactive', 'all']).map((key) => (
              <Pressable
                key={key}
                style={[styles.toggle, section === key && styles.toggleOn]}
                onPress={() => setSection(key)}
              >
                <Text style={[styles.toggleText, section === key && styles.toggleTextOn]}>
                  {key === 'active' ? 'Active' : key === 'inactive' ? 'Inactive' : 'All'}
                </Text>
              </Pressable>
            ))}
          </View>

          {visibleMembers.length === 0 ? (
            <Text style={styles.empty}>No team members in this view.</Text>
          ) : (
            visibleMembers.map((m) => (
              <View key={m.id} style={styles.memberCard}>
                <View style={styles.memberHead}>
                  <Text style={styles.memberName}>{m.name || '—'}</Text>
                  <Text style={styles.memberRole}>{(m.user_type || '').toUpperCase()}</Text>
                </View>
                <Text style={styles.memberMeta}>{m.phone || m.username || '—'}</Text>
                <Text style={[styles.memberMeta, m.is_active ? styles.activeTxt : styles.inactiveTxt]}>
                  {m.is_active ? 'Active' : 'Inactive'}
                </Text>
                <Pressable style={styles.editLink} onPress={() => startEdit(m)} disabled={Boolean(editingId)}>
                  <Text style={styles.editLinkText}>Edit</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FieldLabel({ children }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function RolePicker({ value, onChange }) {
  return (
    <View style={styles.roleRow}>
      {['staff', 'manager'].map((r) => (
        <Pressable
          key={r}
          style={[styles.roleChip, value === r && styles.roleChipOn]}
          onPress={() => onChange(r)}
        >
          <Text style={[styles.roleChipText, value === r && styles.roleChipTextOn]}>{r}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  loader: { marginTop: 24 },
  subtitle: { fontSize: 14, color: MUTED, marginBottom: 12, lineHeight: 20 },
  bannerErr: { color: '#B91C1C', marginBottom: 10, fontFamily: FONT.semibold },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  cardTitle: { fontSize: 17, fontFamily: FONT.bold, color: SLATE, marginBottom: 6 },
  fieldLabel: { fontSize: 13, fontFamily: FONT.semibold, color: SLATE, marginTop: 6 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: SLATE,
    backgroundColor: '#FFFFFF',
  },
  fieldErr: { color: '#DC2626', fontSize: 13, marginBottom: 4 },
  infoText: { color: MUTED, fontSize: 13, marginBottom: 4 },
  devOtp: { fontSize: 12, color: '#64748B', fontFamily: FONT.medium },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  switchLabel: { fontSize: 15, color: SLATE, fontFamily: FONT.semibold },
  roleRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  roleChipOn: { backgroundColor: '#FFEDD5', borderWidth: 1, borderColor: BRAND_ORANGE },
  roleChipText: { fontFamily: FONT.semibold, color: '#475569', textTransform: 'capitalize' },
  roleChipTextOn: { color: '#C2410C' },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: BRAND_ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontFamily: FONT.bold, fontSize: 16 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: { color: SLATE, fontFamily: FONT.semibold, fontSize: 15 },
  btnDisabled: { opacity: 0.55 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  toggleOn: { backgroundColor: '#FFF7ED' },
  toggleText: { fontFamily: FONT.semibold, color: '#64748B', fontSize: 14 },
  toggleTextOn: { color: '#C2410C' },
  memberCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  memberHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  memberName: { fontSize: 16, fontFamily: FONT.bold, color: SLATE, flex: 1 },
  memberRole: { fontSize: 11, fontFamily: FONT.semibold, color: BRAND_ORANGE },
  memberMeta: { fontSize: 14, color: MUTED, marginTop: 4 },
  activeTxt: { color: '#166534' },
  inactiveTxt: { color: '#B91C1C' },
  editLink: { marginTop: 10, alignSelf: 'flex-start' },
  editLinkText: { fontFamily: FONT.bold, color: BRAND_ORANGE, fontSize: 15 },
  empty: { textAlign: 'center', color: MUTED, marginTop: 16 },
});
