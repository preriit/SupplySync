import { StyleSheet, Text, View } from 'react-native';

import { FONT } from '../theme/typography';
import { DealerBackButton } from './DealerBackButton';

const SLATE = '#0F172A';

/** Second row under DealerAppBar: chevron back + centered title (stack / modal-style screens). */
export function DealerStackHeader({ title, onBack }) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <DealerBackButton onBack={onBack} />
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
  side: { width: 48, minHeight: 44, justifyContent: 'center', alignItems: 'flex-start' },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: FONT.bold,
    color: SLATE,
    textAlign: 'center',
  },
});
