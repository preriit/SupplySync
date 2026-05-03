import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const SLATE = '#0F172A';
const BRAND_ORANGE = '#EA580C';
const CARD = '#FFFFFF';

/**
 * Primary dealer header: menu · SupplySync logo · notifications (dashboard) or search (elsewhere).
 */
export function DealerAppBar({
  onMenuPress,
  rightAction,
  showUnreadDot = false,
  onNotificationsPress,
  /** Defaults to navigate to /search; override e.g. to focus search field on Search screen. */
  onSearchPress,
}) {
  const openSearch = onSearchPress ?? (() => router.push('/search'));

  return (
    <View style={styles.bar}>
      <Pressable accessibilityLabel="Open menu" style={styles.hit} onPress={onMenuPress}>
        <Ionicons name="menu-outline" size={26} color={SLATE} />
      </Pressable>
      <Text style={styles.logo}>
        Supply<Text style={styles.logoAccent}>Sync</Text>
      </Text>
      {rightAction === 'notifications' ? (
        <Pressable
          accessibilityLabel={
            showUnreadDot ? 'Unread notifications. Open for details.' : 'Notifications'
          }
          style={styles.hit}
          onPress={onNotificationsPress}
        >
          <Ionicons name="notifications-outline" size={24} color={SLATE} />
          {showUnreadDot ? <View style={styles.dot} accessibilityElementsHidden /> : null}
        </Pressable>
      ) : (
        <Pressable accessibilityLabel="Search" style={styles.hit} onPress={openSearch}>
          <Ionicons name="search-outline" size={24} color={SLATE} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: CARD,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: CARD,
  },
  logo: { fontSize: 18, fontWeight: '800', color: SLATE },
  logoAccent: { color: BRAND_ORANGE },
});
