import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

const SLATE = '#0F172A';

/**
 * Compact chevron back (stack / pushed routes). Prefer over text "Back" for thumb reach + platform affordance.
 */
export function DealerBackButton({ onBack, color = SLATE, size = 26, style }) {
  const go = onBack ?? (() => router.back());
  return (
    <Pressable
      onPress={go}
      style={[styles.hit, style]}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 40,
    height: 40,
    marginLeft: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
