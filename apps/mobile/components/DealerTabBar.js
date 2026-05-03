import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND_ORANGE = '#EA580C';
/** Desktop dealer sidebar — DealerNav `bg-[#0B1F3A]`. */
const NAVY_DEALER = '#0B1F3A';
const TAB_INACTIVE = 'rgba(255, 255, 255, 0.62)';

/** Tab roots only — stack pushes (product detail, activity, search) hide this bar. */
const TABS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'home-outline',
    iconActive: 'home',
    accessibilityLabel: 'Dashboard',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    href: '/inventory',
    icon: 'cube-outline',
    iconActive: 'cube',
    accessibilityLabel: 'Inventory',
  },
  {
    key: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: 'bar-chart-outline',
    iconActive: 'bar-chart',
    accessibilityLabel: 'Reports',
  },
  {
    key: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: 'person-outline',
    iconActive: 'person',
    accessibilityLabel: 'Profile',
  },
];

/**
 * Primary dealer bottom navigation (Wave 2). Real destinations only — no placeholders.
 */
export function DealerTabBar({ current }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const active = tab.key === current;
        const iconName = active ? tab.iconActive : tab.icon;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.accessibilityLabel}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => {
              if (tab.key !== current) {
                router.replace(tab.href);
              }
            }}
          >
            <Ionicons name={iconName} size={23} color={active ? BRAND_ORANGE : TAB_INACTIVE} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: NAVY_DEALER,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 4,
    gap: 3,
  },
  tabPressed: {
    opacity: 0.72,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TAB_INACTIVE,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: BRAND_ORANGE,
  },
});
