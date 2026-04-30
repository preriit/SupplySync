import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { createAuthHelpers, createSessionManager } from '@supplysync/core';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { secureStorage } from '../lib/storage';

export default function DashboardScreen() {
  const [userName, setUserName] = useState('Dealer');
  const dealerSessionManager = createSessionManager(secureStorage);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      const authHelpers = createAuthHelpers(dealerSessionManager);
      const isLoggedIn = await authHelpers.isAuthenticated('dealer');
      if (!mounted) {
        return;
      }
      if (!isLoggedIn) {
        router.replace('/login');
        return;
      }
      const user = await authHelpers.getCurrentUser('dealer');
      if (!mounted || !user) {
        return;
      }
      const nextName = user?.merchant_name || user?.username || 'Dealer';
      setUserName(nextName);
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await dealerSessionManager.clearSession('dealer');
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome, {userName}</Text>
        <Text style={styles.subtitle}>
          Mobile routing and shared API client are now wired.
        </Text>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/inventory')}>
          <Text style={styles.secondaryButtonText}>Open Inventory</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    color: '#475569',
  },
  button: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
