import type { IsoDate } from '@bocado/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Chip, Icon } from '@/components';
import { openTextAnalysis } from '@/features/scan/textRequest';
import { fontFamily, radii, spacing, useTheme } from '@/theme';

/** Empty day: talk or type buttons and example phrases that analyze straight away. */
export function TodayEmpty({ date }: { date: IsoDate }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const examples = [t('today.example1'), t('today.example2')];
  return (
    <View style={[styles.empty, { borderColor: colors.border }]}>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('logBar.voice')}
          onPress={() => router.push({ pathname: '/listen', params: { date } })}
          style={[styles.emptyMic, { backgroundColor: colors.surfaceAlt }]}
        >
          <Icon name="mic" size={30} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('logBar.type')}
          onPress={() => router.push({ pathname: '/text-log', params: { date } })}
          style={[styles.emptyMic, { backgroundColor: colors.surfaceAlt }]}
          testID="today-empty-write"
        >
          <Icon name="edit" size={28} />
        </Pressable>
      </View>
      <AppText style={styles.emptyTitle} align="center">
        {t('today.emptyTitle')}
      </AppText>
      <AppText color="textMuted" align="center">
        {t('today.emptyBody')}
      </AppText>
      <View style={styles.examples}>
        {examples.map((e) => (
          <Chip
            key={e}
            label={`«${e}»`}
            onPress={() => openTextAnalysis({ text: e, source: 'text', date }, 'push')}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radii.xxxl,
    padding: spacing.xxl,
  },
  emptyMic: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
  emptyTitle: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 26 },
  examples: { gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
});
