import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { buildLoginPayload, createSessionManager } from '@supplysync/core';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { secureStorage } from '../lib/storage';
import { FONT } from '../theme/typography';

function resolveLoginErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  if (error?.code === 'ECONNABORTED') {
    return 'Login request timed out. Check backend logs, API URL, and network, then retry.';
  }
  if (!error?.response) {
    return 'Cannot reach backend API. Set EXPO_PUBLIC_BACKEND_URL to your laptop IP (not localhost).';
  }
  return 'Unable to login. Please check credentials.';
}

export default function LoginScreen() {
  const dealerSessionManager = createSessionManager(secureStorage);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [loginMethod, setLoginMethod] = useState('password');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const completeLogin = async (response) => {
    const { access_token, user } = response.data;
    await dealerSessionManager.setSession({
      token: access_token,
      user,
      scope: 'dealer',
    });
    router.replace('/dashboard');
  };

  const handlePasswordLogin = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const payload = buildLoginPayload(identifier, password);
      const response = await api.post('/auth/login', payload);
      await completeLogin(response);
    } catch (err) {
      setError(resolveLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login/request-otp', {
        phone: identifier.trim(),
      });
      setOtpRequested(true);
      setOtpCooldown(Number(response.data?.cooldown_seconds) || 30);
      setInfoMessage(
        response.data?.dev_only_otp
          ? `OTP sent. Dev OTP: ${response.data.dev_only_otp}`
          : 'OTP sent to your mobile number.',
      );
    } catch (err) {
      setError(resolveLoginErrorMessage(err) || 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login/verify-otp', {
        phone: identifier.trim(),
        otp: otp.trim(),
      });
      await completeLogin(response);
    } catch (err) {
      setError(resolveLoginErrorMessage(err) || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (loginMethod === 'password') {
      await handlePasswordLogin();
      return;
    }
    if (!otpRequested) {
      await handleRequestOtp();
      return;
    }
    await handleVerifyOtp();
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.shell}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>
            Supply<Text style={styles.brandAccent}>Sync</Text>
          </Text>
          <Text style={styles.heroTitle}>
            Smart inventory.{'\n'}Stronger business.
          </Text>
          <Text style={styles.heroSub}>Real-time control over your stock, anytime, anywhere.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back!</Text>
          <Text style={styles.cardSub}>Login to your account</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}

          <View style={styles.modeTabs}>
            <Pressable
              style={[styles.modeTab, loginMethod === 'password' && styles.modeTabActive]}
              onPress={() => {
                setLoginMethod('password');
                setOtpRequested(false);
                setOtp('');
                setOtpCooldown(0);
                setError('');
                setInfoMessage('');
              }}
              disabled={loading}
            >
              <Text style={[styles.modeTabText, loginMethod === 'password' && styles.modeTabTextActive]}>
                Password
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeTab, loginMethod === 'otp' && styles.modeTabActive]}
              onPress={() => {
                setLoginMethod('otp');
                setPassword('');
                setError('');
                setInfoMessage('');
              }}
              disabled={loading}
            >
              <Text style={[styles.modeTabText, loginMethod === 'otp' && styles.modeTabTextActive]}>OTP</Text>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{loginMethod === 'password' ? 'Email or mobile' : 'Mobile number'}</Text>
            <TextInput
              style={styles.input}
              placeholder={loginMethod === 'password' ? 'dealer@example.com / 9876543210' : '9876543210'}
              placeholderTextColor="#94A3B8"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType={loginMethod === 'password' ? 'default' : 'phone-pad'}
              editable={!loading}
            />
          </View>

          {loginMethod === 'password' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputWithRight]}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <Pressable
                  style={styles.rightIcon}
                  onPress={() => setShowPassword((p) => !p)}
                  disabled={loading}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
                </Pressable>
              </View>
              <Text style={styles.auxLink}>Forgot password?</Text>
            </View>
          ) : otpRequested ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor="#94A3B8"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>
          ) : null}

          <Pressable style={styles.primaryBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {loginMethod === 'password' ? 'Login' : otpRequested ? 'Verify OTP' : 'Send OTP'}
              </Text>
            )}
          </Pressable>

          {loginMethod === 'otp' && otpRequested ? (
            <View style={styles.resendWrap}>
              <Pressable onPress={handleRequestOtp} disabled={loading || otpCooldown > 0}>
                <Text style={[styles.resendText, (loading || otpCooldown > 0) && styles.resendTextDisabled]}>
                  {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>No account?</Text>
            <Pressable onPress={() => router.push('/signup')} disabled={loading}>
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  shell: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 18 },
  brandBlock: { marginBottom: 14 },
  brand: {
    fontSize: 26,
    fontFamily: FONT.bold,
    color: '#0F172A',
  },
  brandAccent: { color: '#F97316' },
  heroTitle: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: FONT.bold,
    color: '#0F172A',
  },
  heroSub: { marginTop: 8, color: '#64748B', fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 20, fontFamily: FONT.bold, color: '#0F172A', textAlign: 'center' },
  cardSub: { marginTop: 4, color: '#64748B', textAlign: 'center', marginBottom: 12 },
  fieldGroup: { marginBottom: 12 },
  modeTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  modeTab: { flex: 1, alignItems: 'center', paddingBottom: 8 },
  modeTabActive: { borderBottomWidth: 2, borderBottomColor: '#F97316' },
  modeTabText: { color: '#64748B', fontFamily: FONT.semibold, fontSize: 13 },
  modeTabTextActive: { color: '#C2410C' },
  label: { color: '#0F172A', fontFamily: FONT.semibold, marginBottom: 6, fontSize: 13 },
  inputRow: { position: 'relative', justifyContent: 'center' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  inputWithRight: { paddingRight: 44 },
  rightIcon: {
    position: 'absolute',
    right: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: FONT.bold,
    fontSize: 15,
  },
  error: {
    color: '#DC2626',
    marginBottom: 10,
    textAlign: 'center',
  },
  info: {
    color: '#0F766E',
    marginBottom: 10,
    textAlign: 'center',
  },
  auxLink: { marginTop: 8, textAlign: 'right', color: '#F97316', fontSize: 12, fontFamily: FONT.medium },
  resendWrap: { marginTop: 10, alignItems: 'center' },
  resendText: { color: '#F97316', fontSize: 13, fontFamily: FONT.semibold },
  resendTextDisabled: { color: '#94A3B8' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  footerText: { color: '#64748B' },
  footerLink: { color: '#F97316', fontFamily: FONT.semibold },
});
