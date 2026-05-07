import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import {
  buildActivitySignature,
  DASHBOARD_ACTIVITY_ACK_KEY,
  DASHBOARD_ALERT_DIGEST_KEY,
  migrateLegacyAlertDigestToActivityAck,
} from '../lib/dashboardAlertDigest';
import { secureStorage } from '../lib/storage';
import { FONT } from '../theme/typography';

const BRAND_ORANGE = '#EA580C';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const PAGE_BG = '#F5F6FA';
const CARD = '#FFFFFF';

/** Notifications pane — slate-tinted mist (reads gray vs plain white). */
const NOTIF_PANE_SURFACE = 'rgba(241, 245, 249, 0.96)';
const NOTIF_SCRIM = 'rgba(15, 23, 42, 0.3)';
const NOTIF_ROW_DIVIDER = '#E2E8F0';
const NOTIF_BORDER_EDGE = 'rgba(15, 23, 42, 0.12)';
const NOTIF_CHEVRON_SIZE = 20;

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
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const notifPaneWidth = Math.round(windowWidth * 0.8);
  const notifAnim = useRef(new Animated.Value(0)).current;
  const [userName, setUserName] = useState('Dealer');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  /** Last activity snapshot acknowledged via Clear all (stock alerts are not cleared here). */
  const [seenActivityAck, setSeenActivityAck] = useState('');
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

  const currentActivitySig = useMemo(() => buildActivitySignature(stats), [stats]);
  const hasActivityUnread =
    alertDigestReady && currentActivitySig !== seenActivityAck;

  useEffect(() => {
    if (!stats) {
      setAlertDigestReady(false);
      return;
    }
    let cancelled = false;
    setAlertDigestReady(false);
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
      if (cancelled) {
        return;
      }
      setSeenActivityAck(typeof ack === 'string' ? ack : '');
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

  /** Bell: stock attention OR unacknowledged activity updates. */
  const hasUnreadAlerts =
    alertDigestReady && (attentionSkus > 0 || hasActivityUnread);
  /** Clears recent inventory lines only; stock row and SKU counts unchanged. */
  const canClearActivityNotifications =
    Boolean(stats) && alertDigestReady && hasActivityUnread;

  const showActivityNotificationRows = hasActivityUnread && recentActivity.length > 0;

  const markActivityNotificationsClear = async () => {
    if (!stats) {
      return;
    }
    const sig = buildActivitySignature(stats);
    await secureStorage.setItem(DASHBOARD_ACTIVITY_ACK_KEY, sig);
    setSeenActivityAck(sig);
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
                width: notifPaneWidth,
                top: 0,
                bottom: 0,
                right: 0,
                paddingTop: insets.top + 8,
                paddingBottom: Math.max(insets.bottom, 16),
                opacity: notifAnim,
                transform: [
                  {
                    translateX: notifAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [notifPaneWidth, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.notifHeaderRow}>
              <Text style={styles.notifHeaderTitle}>Notifications</Text>
              {canClearActivityNotifications ? (
                <Pressable
                  onPress={() => {
                    markActivityNotificationsClear();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all"
                  accessibilityHint="Clears recent inventory updates from this list. Stock alerts are unchanged."
                  hitSlop={8}
                >
                  <Text style={styles.notifClearAll}>Clear all</Text>
                </Pressable>
              ) : null}
            </View>
            <ScrollView
              style={styles.notifPopoverScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.notifPopoverScrollContent}
            >
              <>
                <Pressable
                  style={styles.notifRow}
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
                    <View style={styles.notifStockTitleRow}>
                      <Text
                        style={[
                          styles.notifRowTitle,
                          styles.notifStockTitleText,
                          attentionSkus > 0 && styles.notifRowTitleUrgent,
                        ]}
                      >
                        Stock alerts
                      </Text>
                      {attentionSkus > 0 ? (
                        <View style={styles.notifAttentionBadge}>
                          <Text style={styles.notifAttentionBadgeText}>Needs attention</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.notifRowMeta}>
                      {attentionSkus > 0
                        ? `${attentionSkus} SKU${attentionSkus === 1 ? '' : 's'} low or out of stock`
                        : 'No SKUs need attention right now'}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={NOTIF_CHEVRON_SIZE}
                    color={attentionSkus > 0 ? BRAND_ORANGE : MUTED}
                  />
                </Pressable>

                {recentActivity.length === 0 ? (
                  <View style={[styles.notifRow, styles.notifRowLast]}>
                    <Text style={styles.notifRowEmpty}>No recent inventory updates yet.</Text>
                  </View>
                ) : (
                  showActivityNotificationRows &&
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
              </>
            </ScrollView>
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
  greeting: { fontSize: 22, fontFamily: FONT.bold, color: SLATE, marginTop: 16 },
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
  searchGoText: { color: '#FFFFFF', fontFamily: FONT.bold },
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
    fontFamily: FONT.bold,
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
  sectionTitle: { fontSize: 16, fontFamily: FONT.bold, color: SLATE },
  sectionSub: { fontSize: 13, color: MUTED, marginTop: 2 },
  sectionLink: { fontSize: 14, fontFamily: FONT.bold, color: BRAND_ORANGE },
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
  summaryValue: { fontSize: 20, fontFamily: FONT.bold, color: SLATE },
  summaryValueAlert: { color: '#DC2626' },
  summaryLabel: { fontSize: 12, color: MUTED, marginTop: 4, fontFamily: FONT.semibold },
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
    fontFamily: FONT.bold,
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
  activityTitle: { fontSize: 14, fontFamily: FONT.semibold, color: SLATE, lineHeight: 20 },
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
    flexDirection: 'column',
    backgroundColor: NOTIF_PANE_SURFACE,
    paddingHorizontal: 18,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: NOTIF_BORDER_EDGE,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 14 },
      default: {},
    }),
  },
  notifPopoverScroll: {
    flex: 1,
    marginTop: 4,
    minHeight: 0,
  },
  notifPopoverScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NOTIF_ROW_DIVIDER,
  },
  notifHeaderTitle: { fontSize: 17, fontFamily: FONT.bold, color: SLATE, flexShrink: 1 },
  notifClearAll: { fontSize: 15, fontFamily: FONT.semibold, color: BRAND_ORANGE },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0,
    paddingRight: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NOTIF_ROW_DIVIDER,
    gap: 10,
  },
  notifRowLast: {
    borderBottomWidth: 0,
  },
  notifRowBody: { flex: 1, minWidth: 0 },
  notifStockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 6,
  },
  /** Avoid flex shrink so glyphs (e.g. leading “S”) are not clipped beside the badge. */
  notifStockTitleText: {
    flexShrink: 0,
    paddingRight: 2,
  },
  notifRowTitle: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: SLATE,
    lineHeight: 20,
  },
  notifRowTitleUrgent: {
    color: BRAND_ORANGE,
  },
  notifAttentionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(234, 88, 12, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(234, 88, 12, 0.35)',
  },
  notifAttentionBadgeText: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    color: BRAND_ORANGE,
    letterSpacing: -0.2,
  },
  notifRowMeta: { fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 16 },
  notifRowEmpty: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    paddingVertical: 10,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NOTIF_SCRIM,
    zIndex: 1,
  },
});
