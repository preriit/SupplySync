import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { createAuthHelpers, createSessionManager } from '@supplysync/core';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerTabBar } from '../components/DealerTabBar';
import { secureStorage } from '../lib/storage';

export default function MoreScreen() {
  const [userName, setUserName] = useState('');
  const dealerSessionManager = useMemo(() => createSessionManager(secureStorage), []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const authHelpers = createAuthHelpers(dealerSessionManager);
      const ok = await authHelpers.isAuthenticated('dealer');
      if (!mounted) return;
      if (!ok) {
        router.replace('/login');
        return;
      }
      const user = await authHelpers.getCurrentUser('dealer');
      if (!mounted || !user) return;
      setUserName(user?.merchant_name || user?.username || 'Dealer');
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await dealerSessionManager.clearSession('dealer');
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.sub}>{userName}</Text>
        <Pressable style={styles.row} onPress={() => router.push('/activity')}>
          <Text style={styles.rowText}>Recent activity</Text>
        </Pressable>
        <Text style={styles.hint}>Team and settings can move here as you ship them.</Text>
        <View style={styles.spacer} />
        <Pressable style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
      <DealerTabBar current="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  content: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  sub: { color: '#475569', marginBottom: 8 },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  rowText: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  hint: { color: '#94A3B8', fontSize: 13, marginTop: 8 },
  spacer: { flex: 1, minHeight: 16 },
  logout: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#FFFFFF', fontWeight: '700' },
});
