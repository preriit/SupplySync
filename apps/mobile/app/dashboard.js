import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { createAuthHelpers, createSessionManager } from '@supplysync/core';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DealerAppBar } from '../components/DealerAppBar';
import { DealerMenuSheet } from '../components/DealerMenuSheet';
import { DealerTabBar } from '../components/DealerTabBar';
import { api } from '../lib/api';
import { buildDashboardAlertDigest, DASHBOARD_ALERT_DIGEST_KEY } from '../lib/dashboardAlertDigest';
import { secureStorage } from '../lib/storage';

const BRAND_ORANGE = '#EA580C';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const PAGE_BG = '#F5F6FA';
const CARD = '#FFFFFF';

/** Compact phones: fewer activity lines + shorter scroll; tablets / tall: more preview rows. */
function useActivityPreviewRows() {
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const shortSide = Math.min(width, height);
    if (height >= 820 || shortSide >= 600 || (width >= 768 && height >= 680)) {
      return 10;
    }
    return 4;
  }, [width, height]);
}

export default function DashboardScreen() {
  const activityPreviewRows = useActivityPreviewRows();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const notifAnim = useRef(new Animated.Value(0)).current;
  const [userName, setUserName] = useState('Dealer');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  /** Last digest the user acknowledged with "Mark all as read" (loaded from secure storage). */
  const [seenAlertDigest, setSeenAlertDigest] = useState('');
  const [alertDigestReady, setAlertDigestReady] = useState(false);

  const dealerSessionManager = useMemo(() => createSessionManager(secureStorage), []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/dealer/dashboard/stats');
      setStats(data);
    } catch (err) {
      setLoadError(err?.response?.data?.detail || 'Could not load dashboard.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const currentAlertDigest = useMemo(() => buildDashboardAlertDigest(stats), [stats]);
  const hasUnreadAlerts = alertDigestReady && currentAlertDigest !== seenAlertDigest;

  useEffect(() => {
    if (!stats) {
      setAlertDigestReady(false);
      return;
    }
    let cancelled = false;
    setAlertDigestReady(false);
    (async () => {
      const stored = await secureStorage.getItem(DASHBOARD_ALERT_DIGEST_KEY);
      if (cancelled) {
        return;
      }
      setSeenAlertDigest(stored ?? '');
      setAlertDigestReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [stats]);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      const authHelpers = createAuthHelpers(dealerSessionManager);
      const isLoggedIn = await authHelpers.isAuthenticated('dealer');
      if (!mounted) return;
      if (!isLoggedIn) {
        router.replace('/login');
        return;
      }
      const user = await authHelpers.getCurrentUser('dealer');
      if (!mounted || !user) return;
      const nextName = user?.merchant_name || user?.username || 'Dealer';
      setUserName(nextName);
      await loadStats();
    };
    boot();
    return () => {
      mounted = false;
    };
  }, [dealerSessionManager, loadStats]);

  useEffect(() => {
    if (!notifOpen) {
      notifAnim.setValue(0);
      return;
    }
    notifAnim.setValue(0);
    Animated.spring(notifAnim, {
      toValue: 1,
      friction: 9,
      tension: 68,
      useNativeDriver: true,
    }).start();
  }, [notifAnim, notifOpen]);

  const totalProducts = Number(stats?.total_products ?? 0);
  const lowSkus = Number(stats?.low_stock_skus ?? 0);
  const outSkus = Number(stats?.out_of_stock_skus ?? 0);
  const inStockComfort = Math.max(0, totalProducts - lowSkus - outSkus);
  const attentionSkus = lowSkus + outSkus;
  const updatesToday = Number(stats?.inventory_transactions_today ?? 0);
  const recentActivity = stats?.recent_activity || [];

  const markAllAlertsRead = async () => {
    if (!stats) {
      return;
    }
    const digest = buildDashboardAlertDigest(stats);
    await secureStorage.setItem(DASHBOARD_ALERT_DIGEST_KEY, digest);
    setSeenAlertDigest(digest);
  };

  const openSearchResults = () => {
    const q = searchDraft.trim();
    if (q.length < 2) {
      router.push('/search');
      return;
    }
    router.push({ pathname: '/search', params: { q } });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DealerAppBar
        onMenuPress={() => setMenuOpen(true)}
        rightAction="notifications"
        showUnreadDot={hasUnreadAlerts}
        onNotificationsPress={() => setNotifOpen(true)}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.greeting, activityPreviewRows <= 4 && styles.greetingCompact]}>
          Hi, {userName}!
        </Text>
        <Text style={[styles.greetingSub, activityPreviewRows <= 4 && styles.greetingSubCompact]}>
          {"Here's what's happening with your inventory."}
        </Text>

        {loadError ? <Text style={styles.errorBanner}>{loadError}</Text> : null}

        <View style={[styles.dashboardSurface, activityPreviewRows <= 4 && styles.dashboardSurfaceCompact]}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search product by name, SKU, size…"
              placeholderTextColor="#94A3B8"
              value={searchDraft}
              onChangeText={setSearchDraft}
              returnKeyType="search"
              onSubmitEditing={openSearchResults}
            />
            <Pressable accessibilityLabel="Run search" onPress={openSearchResults} style={styles.searchGo}>
              <Text style={styles.searchGoText}>Go</Text>
            </Pressable>
          </View>

          <View style={[styles.quickRow, activityPreviewRows <= 4 && styles.quickRowCompact]}>
            <View style={styles.quickTileCell}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add product, choose a category first"
              style={[styles.quickTile, styles.tileGreen]}
              onPress={() => router.push('/inventory')}
            >
              <Text style={styles.quickTileIcon}>＋</Text>
              <Text style={styles.quickTileTitle} numberOfLines={2}>
                Add product
              </Text>
              <Text style={styles.quickTileSub} numberOfLines={2}>
                Via categories
              </Text>
            </Pressable>
          </View>
          <View style={styles.quickTileCell}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Low stock, ${lowSkus} low${outSkus > 0 ? `, ${outSkus} out` : ''}`}
              style={[styles.quickTile, styles.tileAmber]}
              onPress={() => router.push('/stock-alerts')}
            >
              <Text style={styles.quickTileIcon}>⚠</Text>
              <Text style={styles.quickTileTitle} numberOfLines={2}>
                Low stock
              </Text>
              <Text style={styles.quickTileSub} numberOfLines={2}>
                {lowSkus} low{outSkus > 0 ? ` · ${outSkus} out` : ''}
              </Text>
            </Pressable>
          </View>
          <View style={styles.quickTileCell}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Browse inventory categories"
              style={[styles.quickTile, styles.tileNeutral]}
              onPress={() => router.push('/inventory')}
            >
              <Text style={styles.quickTileIcon}>▦</Text>
              <Text style={styles.quickTileTitle} numberOfLines={2}>
                Browse inventory
              </Text>
              <Text style={styles.quickTileSub} numberOfLines={2}>
                All categories
              </Text>
            </Pressable>
          </View>
          </View>

          <View style={[styles.sectionHeader, styles.sectionHeaderInPrimary]}>
            <Text style={styles.sectionTitle}>Inventory summary</Text>
            <Pressable onPress={() => router.push('/inventory')}>
              <Text style={styles.sectionLink}>View all</Text>
            </Pressable>
          </View>
          <View style={styles.summaryCard}>
            <Pressable style={styles.summaryCell} onPress={() => router.push('/inventory')}>
              <Text style={styles.summaryValue}>{totalProducts}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </Pressable>
            <View style={styles.summaryDivider} />
            <Pressable style={styles.summaryCell} onPress={() => router.push('/inventory')}>
              <Text style={styles.summaryValue}>{inStockComfort}</Text>
              <Text style={styles.summaryLabel}>In stock</Text>
            </Pressable>
            <View style={styles.summaryDivider} />
            <Pressable style={styles.summaryCell} onPress={() => router.push('/stock-alerts')}>
              <Text style={[styles.summaryValue, styles.summaryValueAlert]}>{lowSkus}</Text>
              <Text style={styles.summaryLabel}>Low</Text>
            </Pressable>
          </View>

          <View style={styles.sheetDivider} />

          <View style={styles.activitySection}>
            <View style={styles.activityCardHeader}>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              <Text style={styles.sectionSub}>
                {updatesToday} update{updatesToday === 1 ? '' : 's'} today
              </Text>
            </View>
            {loading ? (
              <ActivityIndicator color={BRAND_ORANGE} style={styles.activityCardLoading} />
            ) : null}
            {!loading && recentActivity.length === 0 ? (
              <Text style={styles.emptyInCard}>No recent activity.</Text>
            ) : null}
            {!loading && recentActivity.length > 0 ? (
              <ScrollView
                style={styles.activityListScroll}
                contentContainerStyle={styles.activityListScrollContent}
                nestedScrollEnabled={Platform.OS === 'android'}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                {recentActivity.map((row, idx, arr) => (
                  <View
                    key={`${row.created_at}-${idx}`}
                    style={[styles.activityRowInCard, idx === arr.length - 1 && styles.activityRowInCardLast]}
                  >
                    <View
                      style={[
                        styles.activityDot,
                        {
                          backgroundColor:
                            row.action === 'quantity_add'
                              ? '#16A34A'
                              : row.action === 'quantity_subtract'
                                ? '#DC2626'
                                : '#94A3B8',
                        },
                      ]}
                    />
                    <View style={styles.activityRowBody}>
                      <Text style={styles.activityTitle}>{row.title}</Text>
                      <Text style={styles.activityMeta}>{row.time}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            {!loading ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View all activity"
                style={styles.activityViewAllFooter}
                onPress={() => router.push('/activity')}
              >
                <Text style={styles.activityViewAllText}>View all</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <DealerTabBar current="dashboard" />

      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />

      <Modal
        visible={notifOpen}
        animationType="none"
        transparent
        onRequestClose={() => setNotifOpen(false)}
      >
        <View style={styles.notifModalRoot} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setNotifOpen(false)}
            accessibilityLabel="Dismiss"
          />
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.notifPopover,
              {
                top: insets.top + 48,
                right: 8,
                width: Math.min(windowWidth - 24, 360),
                maxHeight: windowHeight * 0.72,
                opacity: notifAnim,
                transform: [
                  {
                    translateY: notifAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-12, 0],
                    }),
                  },
                  {
                    translateX: notifAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                  {
                    scale: notifAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.notifHeaderRow}>
              <Text style={styles.notifHeaderTitle}>Notifications</Text>
              <Pressable
                onPress={() => {
                  markAllAlertsRead();
                }}
                disabled={!stats || !hasUnreadAlerts}
                accessibilityRole="button"
                accessibilityLabel="Clear all"
                accessibilityHint="Clears the unread dot on the bell. Does not change inventory."
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.notifClearAll,
                    (!stats || !hasUnreadAlerts) && styles.notifClearAllDisabled,
                  ]}
                >
                  Clear all
                </Text>
              </Pressable>
            </View>
            <ScrollView
              style={[
                styles.notifPopoverScroll,
                { maxHeight: Math.max(180, windowHeight * 0.72 - 148) },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={styles.notifList}>
                <Pressable
                  style={[
                    styles.notifRow,
                    attentionSkus > 0 ? styles.notifRowAlert : styles.notifRowNeutral,
                  ]}
                  onPress={() => {
                    setNotifOpen(false);
                    router.push('/stock-alerts');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    attentionSkus > 0
                      ? `Stock alerts, ${attentionSkus} SKUs need attention`
                      : 'Stock alerts, all clear'
                  }
                >
                  <View style={styles.notifRowBody}>
                    <Text style={styles.notifRowTitle}>Stock alerts</Text>
                    <Text style={styles.notifRowMeta}>
                      {attentionSkus > 0
                        ? `${attentionSkus} SKU${attentionSkus === 1 ? '' : 's'} low or out of stock`
                        : 'No SKUs need attention right now'}
                    </Text>
                  </View>
                  <Text style={styles.notifRowChevron}>›</Text>
        </Pressable>

                {recentActivity.length === 0 ? (
                  <View style={[styles.notifRow, styles.notifRowLast]}>
                    <Text style={styles.notifRowEmpty}>No recent inventory updates yet.</Text>
                  </View>
                ) : (
                  recentActivity.map((row, idx) => (
                    <View
                      key={`n-${row.created_at || idx}-${idx}`}
                      style={[
                        styles.notifRow,
                        idx === recentActivity.length - 1 ? styles.notifRowLast : null,
                      ]}
                    >
                      <View style={styles.notifRowBody}>
                        <Text style={styles.notifRowTitle} numberOfLines={3}>
                          {row.title}
                        </Text>
                        <Text style={styles.notifRowMeta}>
                          {[row.time, row.actor].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setNotifOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
        </Pressable>
          </Animated.View>
      </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    /** Let row children span the ScrollView content width (helps RN Web). */
    alignSelf: 'stretch',
    minWidth: '100%',
  },
  greeting: { fontSize: 22, fontWeight: '700', color: SLATE, marginTop: 16 },
  greetingCompact: { marginTop: 12, fontSize: 21 },
  greetingSub: { fontSize: 14, color: MUTED, marginTop: 4, marginBottom: 16 },
  greetingSubCompact: { marginBottom: 10 },
  /** One seamless sheet: search, quick actions, summary + recent activity (single border/radius). */
  dashboardSurface: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  dashboardSurfaceCompact: {
    padding: 10,
    marginBottom: 6,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
    alignSelf: 'stretch',
  },
  activitySection: {
    marginHorizontal: -12,
    paddingBottom: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 6,
  },
  searchIcon: { fontSize: 18, color: MUTED },
  searchInput: { flex: 1, fontSize: 16, color: SLATE, paddingVertical: 10 },
  searchGo: {
    backgroundColor: BRAND_ORANGE,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  searchGoText: { color: '#FFFFFF', fontWeight: '700' },
  /** One row, three equal quick actions (Wave 2 — dense, scannable). */
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    width: '100%',
    marginTop: 16,
  },
  quickRowCompact: { marginTop: 10 },
  /** Flex row distributes width across cells; Pressable sits inside (fixes RN Web row + Pressable). */
  quickTileCell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    marginHorizontal: 4,
  },
  quickTile: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    minHeight: 118,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileGreen: { backgroundColor: '#DCFCE7' },
  tileAmber: { backgroundColor: '#FEF3C7' },
  tileNeutral: { backgroundColor: '#E0E7FF' },
  quickTileIcon: { fontSize: 22, marginBottom: 8, color: SLATE },
  quickTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: SLATE,
    textAlign: 'center',
    lineHeight: 16,
  },
  quickTileSub: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
    lineHeight: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
    gap: 8,
  },
  sectionHeaderInPrimary: { marginTop: 14 },
  sectionHeaderLeft: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: SLATE },
  sectionSub: { fontSize: 13, color: MUTED, marginTop: 2 },
  sectionLink: { fontSize: 14, fontWeight: '700', color: BRAND_ORANGE },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EEF2F7',
  },
  summaryCell: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: SLATE },
  summaryValueAlert: { color: '#DC2626' },
  summaryLabel: { fontSize: 12, color: MUTED, marginTop: 4, fontWeight: '600' },
  activityCardHeader: {
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  activityListScroll: {
    maxHeight: 280,
  },
  activityListScrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  activityViewAllFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  activityViewAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND_ORANGE,
  },
  activityCardLoading: { paddingVertical: 24 },
  emptyInCard: {
    color: MUTED,
    paddingVertical: 20,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  activityRowInCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  activityRowInCardLast: {
    borderBottomWidth: 0,
  },
  activityRowBody: { flex: 1, minWidth: 0 },
  activityDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: SLATE, lineHeight: 20 },
  activityMeta: { fontSize: 12, color: MUTED, marginTop: 4 },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  notifModalRoot: {
    flex: 1,
  },
  notifPopover: {
    position: 'absolute',
    zIndex: 2,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 20,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
      },
      android: { elevation: 14 },
      default: {},
    }),
  },
  notifPopoverScroll: {
    flexGrow: 0,
    flexShrink: 1,
    marginTop: 4,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  notifHeaderTitle: { fontSize: 17, fontWeight: '800', color: SLATE, flexShrink: 1 },
  notifClearAll: { fontSize: 15, fontWeight: '700', color: BRAND_ORANGE },
  notifClearAllDisabled: { color: '#CBD5E1', fontWeight: '600' },
  notifList: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EDF3',
    backgroundColor: CARD,
    gap: 10,
  },
  notifRowLast: {
    borderBottomWidth: 0,
  },
  notifRowAlert: {
    backgroundColor: '#FFF7ED',
  },
  notifRowNeutral: {
    backgroundColor: '#F8FAFC',
  },
  notifRowBody: { flex: 1, minWidth: 0 },
  notifRowTitle: { fontSize: 14, fontWeight: '700', color: SLATE, lineHeight: 20 },
  notifRowMeta: { fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 16 },
  notifRowChevron: {
    fontSize: 22,
    fontWeight: '300',
    color: '#94A3B8',
    marginTop: -2,
  },
  notifRowEmpty: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    paddingVertical: 6,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    zIndex: 1,
  },
  modalClose: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalCloseText: { fontSize: 16, fontWeight: '700', color: BRAND_ORANGE },
});
