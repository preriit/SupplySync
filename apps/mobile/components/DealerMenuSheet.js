import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { createSessionManager } from '@supplysync/core';
import { Ionicons } from '@expo/vector-icons';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { secureStorage } from '../lib/storage';
import { FONT } from '../theme/typography';

/** Matches desktop dealer sidebar (`DealerNav`: bg `#0B1F3A`). */
const NAVY_BASE = '11, 31, 58';
const PANE_SURFACE = `rgba(${NAVY_BASE}, 0.92)`;
const MENU_TEXT = 'rgba(255, 255, 255, 0.88)';
const ROW_DIVIDER = 'rgba(255, 255, 255, 0.12)';
/** Softer red for readability on navy (desktop sidebar uses white + orange accents). */
const DESTRUCTIVE_ON_NAVY = '#FCA5A5';
/** Matches tab bar inactive tint — outline icons beside labels. */
const MENU_ICON_MUTED = 'rgba(255, 255, 255, 0.62)';
const MENU_ICON_SIZE = 22;

/** Left drawer (~80% width), full visible height; scrim at 20% opacity on the remaining strip. */
export function DealerMenuSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const paneWidth = Math.round(windowWidth * 0.8);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const dealerSessionManager = useMemo(() => createSessionManager(secureStorage), []);
  const [canManageTeam, setCanManageTeam] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const user = await dealerSessionManager.getUser('dealer');
      if (!cancelled) {
        setCanManageTeam(user?.user_type === 'dealer');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, dealerSessionManager]);

  useEffect(() => {
    if (!visible) {
      menuAnim.setValue(0);
      return;
    }
    menuAnim.setValue(0);
    Animated.spring(menuAnim, {
      toValue: 1,
      friction: 9,
      tension: 68,
      useNativeDriver: true,
    }).start();
  }, [visible, menuAnim]);

  const logout = async () => {
    onClose();
    await dealerSessionManager.clearSession('dealer');
    router.replace('/login');
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot} pointerEvents="box-none">
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss menu" />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.pane,
            {
              width: paneWidth,
              transform: [
                {
                  translateX: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-paneWidth, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.paneInner,
              {
                paddingTop: insets.top + 8,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.menuBlock}>
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  onClose();
                  router.replace('/dashboard');
                }}
                accessibilityRole="button"
                accessibilityLabel="Go to dashboard"
              >
                <Ionicons name="home-outline" size={MENU_ICON_SIZE} color={MENU_ICON_MUTED} />
                <Text style={styles.menuRowText}>Dashboard</Text>
              </Pressable>
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  onClose();
                  router.push('/inventory');
                }}
              >
                <Ionicons name="cube-outline" size={MENU_ICON_SIZE} color={MENU_ICON_MUTED} />
                <Text style={styles.menuRowText}>Inventory</Text>
              </Pressable>
              {canManageTeam ? (
                <Pressable
                  style={styles.menuRow}
                  onPress={() => {
                    onClose();
                    router.push('/team-members');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Team members"
                >
                  <Ionicons name="people-outline" size={MENU_ICON_SIZE} color={MENU_ICON_MUTED} />
                  <Text style={styles.menuRowText}>Team Members</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  onClose();
                  router.push('/activity');
                }}
              >
                <Ionicons name="time-outline" size={MENU_ICON_SIZE} color={MENU_ICON_MUTED} />
                <Text style={styles.menuRowText}>Recent activity</Text>
              </Pressable>
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  onClose();
                  router.push('/profile');
                }}
              >
                <Ionicons name="person-outline" size={MENU_ICON_SIZE} color={MENU_ICON_MUTED} />
                <Text style={styles.menuRowText}>Profile</Text>
              </Pressable>
              <View style={styles.menuSpacer} />
              <Pressable
                style={[styles.menuRow, styles.menuRowLast, styles.logoutRow]}
                onPress={logout}
                accessibilityRole="button"
                accessibilityLabel="Log out"
              >
                <Ionicons name="log-out-outline" size={MENU_ICON_SIZE} color={DESTRUCTIVE_ON_NAVY} />
                <Text style={styles.logoutText}>Log out</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `rgba(${NAVY_BASE}, 0.28)`,
    zIndex: 1,
  },
  pane: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 2,
    backgroundColor: PANE_SURFACE,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255, 255, 255, 0.14)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  paneInner: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  menuBlock: {
    flex: 1,
    paddingTop: 8,
  },
  menuSpacer: {
    flex: 1,
    minHeight: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ROW_DIVIDER,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuRowText: { fontSize: 17, fontFamily: FONT.semibold, color: MENU_TEXT },
  logoutRow: {
    marginTop: 4,
  },
  logoutText: {
    fontSize: 17,
    fontFamily: FONT.semibold,
    color: DESTRUCTIVE_ON_NAVY,
  },
});
