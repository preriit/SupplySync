import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../components/DealerAppBar';
import { DealerMenuSheet } from '../components/DealerMenuSheet';
import { DealerTabBar } from '../components/DealerTabBar';
import {
  buildActivitySignatureFromActivities,
  DASHBOARD_ACTIVITY_ACK_KEY,
  DASHBOARD_ALERT_DIGEST_KEY,
  migrateLegacyAlertDigestToActivityAck,
} from '../lib/dashboardAlertDigest';
import { api } from '../lib/api';
import { secureStorage } from '../lib/storage';
import { FONT } from '../theme/typography';

const SLATE = '#0F172A';
const MUTED = '#64748B';
const BRAND_ORANGE = '#EA580C';

function actionColor(action) {
  if (action === 'quantity_add') return '#16A34A';
  if (action === 'quantity_subtract') return '#DC2626';
  return '#64748B';
}

export default function ActivityScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seenAck, setSeenAck] = useState('');
  const [ackReady, setAckReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let ack = await secureStorage.getItem(DASHBOARD_ACTIVITY_ACK_KEY);
      if (ack == null) {
        const legacy = await secureStorage.getItem(DASHBOARD_ALERT_DIGEST_KEY);
        if (legacy) {
          ack = migrateLegacyAlertDigestToActivityAck(legacy);
          await secureStorage.setItem(DASHBOARD_ACTIVITY_ACK_KEY, ack);
          await secureStorage.removeItem(DASHBOARD_ALERT_DIGEST_KEY);
        } else {
          ack = '';
        }
      }
      if (cancelled) return;
      setSeenAck(typeof ack === 'string' ? ack : '');
      setAckReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get('/dealer/dashboard/recent-activity', { params: { limit: 50 } });
        if (!mounted) return;
        setItems(data?.activities || []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load activity.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const currentSig = useMemo(() => buildActivitySignatureFromActivities(items), [items]);
  const canClear = ackReady && items.length > 0 && currentSig !== seenAck;

  const clearAll = async () => {
    const sig = buildActivitySignatureFromActivities(items);
    await secureStorage.setItem(DASHBOARD_ACTIVITY_ACK_KEY, sig);
    setSeenAck(sig);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Recent activity</Text>
          {canClear ? (
            <Pressable
              onPress={() => {
                clearAll();
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear all"
              accessibilityHint="Marks recent inventory updates as seen on this device."
              hitSlop={8}
            >
              <Text style={styles.clearAll}>Clear all</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.subtitle}>Latest changes across your inventory.</Text>
        {!loading && items.length > 0 ? (
          <Text style={styles.countLine}>
            {items.length} update{items.length === 1 ? '' : 's'}
          </Text>
        ) : null}
        {loading ? <ActivityIndicator style={styles.loader} color={BRAND_ORANGE} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && items.length === 0 ? <Text style={styles.empty}>No activity yet.</Text> : null}
        {items.length > 0 ? (
          <View style={styles.listGroupWrap}>
            <FlatList
              style={styles.list}
              data={items}
              keyExtractor={(item, index) => `${item.created_at || ''}-${index}`}
              contentContainerStyle={styles.listGroupedContent}
              ItemSeparatorComponent={() => <View style={styles.rowSep} />}
              renderItem={({ item }) => (
                <View style={styles.listRow}>
                  <View style={[styles.dot, { backgroundColor: actionColor(item.action) }]} />
                  <View style={styles.listRowBody}>
                    <Text style={styles.rowTitle} numberOfLines={4}>
                      {item.title}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {item.time}
                      {item.actor ? ` · ${item.actor}` : ''}
                    </Text>
                  </View>
                </View>
              )}
            />
          </View>
        ) : null}
      </View>
      <DealerTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  body: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: FONT.bold,
    color: SLATE,
    flexShrink: 1,
  },
  clearAll: { fontSize: 15, fontFamily: FONT.semibold, color: BRAND_ORANGE },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  countLine: {
    paddingHorizontal: 16,
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  loader: { marginTop: 12 },
  error: { color: '#DC2626', paddingHorizontal: 16, marginBottom: 8 },
  list: { flex: 1 },
  listGroupWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  listGroupedContent: { paddingBottom: 16 },
  rowSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EEF2F7',
    marginLeft: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  listRowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: SLATE,
    lineHeight: 21,
  },
  rowMeta: { fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 18 },
  empty: { textAlign: 'center', color: MUTED, marginTop: 28, fontSize: 14 },
});
