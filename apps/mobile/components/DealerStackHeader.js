import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const SLATE = '#0F172A';
const BRAND_ORANGE = '#EA580C';

/** Second row under DealerAppBar: Back + centered title (stack / modal-style screens). */
export function DealerStackHeader({ title, onBack }) {
  const goBack = onBack ?? (() => router.back());
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <Pressable onPress={goBack} style={styles.backHit} hitSlop={12} accessibilityLabel="Go back">
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  side: { width: 72, minHeight: 44, justifyContent: 'center' },
  backHit: { paddingVertical: 8, paddingHorizontal: 4 },
  backText: { color: BRAND_ORANGE, fontWeight: '700', fontSize: 16 },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: SLATE,
    textAlign: 'center',
  },
});
