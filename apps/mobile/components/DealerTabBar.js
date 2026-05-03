import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { key: 'dashboard', label: 'Home', href: '/dashboard' },
  { key: 'inventory', label: 'Inventory', href: '/inventory' },
  { key: 'more', label: 'More', href: '/more' },
];

/**
 * Primary dealer bottom navigation (Wave 2). No placeholder routes —
 * Orders/Reports ship here only when real screens exist.
 */
export function DealerTabBar({ current }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const active = tab.key === current;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => {
              if (tab.key !== current) {
                router.replace(tab.href);
              }
            }}
          >
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
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabPressed: {
    opacity: 0.75,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#EA580C',
  },
});
