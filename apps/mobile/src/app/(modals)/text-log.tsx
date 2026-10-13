import type { IsoDate } from '@plato/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Chip, Icon, Screen, ScreenHeader } from '@/components';
import { features } from '@/config/features';
import { MEAL_ICONS } from '@/features/diary/mealIcons';
import { detectMeals } from '@/features/scan/detectMeals';
import { useQuotaStatus } from '@/features/scan/useQuota';
import { usePlan } from '@/services/purchases';
import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { openTextAnalysis } from '@/features/scan/textRequest';
import { dateParam } from '@/utils/dates';

/** "Contá qué comiste": type (or paste) the description; the mic goes back to listening. */
export default function TextLog() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ date?: IsoDate; text?: string }>();
  const [text, setText] = useState(params.text ?? '');
  const quota = useQuotaStatus();
  const plan = usePlan();
  const meals = detectMeals(text);
  const left = quota.data?.text_query.remaining;
  const examples = [t('textLog.example1'), t('textLog.example2'), t('textLog.example3')];
  const validDate = dateParam(params.date);
  const date = validDate ? { date: validDate } : {};

  const analyze = () =>
    openTextAnalysis({ text: text.trim(), source: 'text', date: validDate ?? null });

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        <View style={styles.footer}>
          {features.voiceLogging ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('textLog.listen')}
              onPress={() => router.replace({ pathname: '/listen', params: { text, ...date } })}
              style={[styles.mic, { backgroundColor: colors.surfaceAlt }]}
              testID="text-log-mic"
            >
              <Icon name="mic" size={26} />
            </Pressable>
          ) : null}
          <View style={styles.flex}>
            <Button
              label={t('textLog.analyze')}
              icon="auto_awesome"
              onPress={analyze}
              disabled={text.trim().length < 2}
              testID="text-log-analyze"
            />
          </View>
        </View>
      }
    >
      <ScreenHeader title={t('textLog.title')} close />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('textLog.placeholder')}
        placeholderTextColor={colors.textSubtle}
        multiline
        maxLength={1000}
        autoFocus={!params.text}
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
        ]}
        accessibilityLabel={t('textLog.title')}
        testID="text-log-input"
      />
      {meals.length ? (
        <View style={styles.row}>
          <AppText variant="label" color="textMuted">
            {t('textLog.willSplit')}
          </AppText>
          {meals.map((m) => (
            <View key={m.mealType} style={[styles.meal, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={MEAL_ICONS[m.mealType]} size={16} />
              <AppText variant="label">{t(`mealTypes.${m.mealType}`)}</AppText>
            </View>
          ))}
        </View>
      ) : null}
      <AppText variant="subheading" style={styles.examplesTitle}>
        {t('textLog.examples')}
      </AppText>
      <View style={styles.examples}>
        {examples.map((e) => (
          <Chip key={e} label={e} onPress={() => setText(e)} />
        ))}
      </View>
      {plan === 'free' && left != null ? (
        <AppText variant="caption" color="textSubtle">
          {t('textLog.quotaLeft', { count: left })}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  input: {
    minHeight: 168,
    borderWidth: 1.5,
    borderRadius: radii.xxl,
    padding: 18,
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 28,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  examplesTitle: { fontSize: 15 },
  examples: { alignItems: 'flex-start', gap: spacing.sm },
  footer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  mic: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
