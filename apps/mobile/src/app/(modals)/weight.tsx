import { kgToLb, lbToKg } from '@plato/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  BigNumberInput,
  Button,
  Card,
  IconButton,
  ListRow,
  Screen,
  toast,
} from '@/components';
import { deleteWeight, logWeight, useWeights } from '@/features/body/hooks';
import { checkAchievements } from '@/features/habits/hooks';
import { isHealthSupported, writeWeightKg } from '@/services/health';
import { usePlan } from '@/services/purchases';
import { usePrefsStore } from '@/stores/prefs';
import { spacing } from '@/theme';
import { formatDay, todayLocal } from '@/utils/dates';
import { formatNumber, formatWeight, parseDecimal } from '@/utils/format';

export default function WeightModal() {
  const { t } = useTranslation();
  const units = usePrefsStore((s) => s.units);
  const plan = usePlan();
  const weights = useWeights();
  const last = weights.data?.[weights.data.length - 1];
  const [text, setText] = useState(
    last ? formatNumber(units === 'imperial' ? kgToLb(last.weight_kg) : last.weight_kg, 1) : '',
  );
  const value = parseDecimal(text);
  const kg = value == null ? null : units === 'imperial' ? lbToKg(value) : value;
  const valid = kg != null && kg >= 20 && kg <= 400;

  const save = async () => {
    if (!valid) return;
    await logWeight(todayLocal(), kg);
    if (plan === 'premium' && isHealthSupported()) writeWeightKg(kg).catch(() => undefined);
    checkAchievements().catch(() => undefined);
    toast.success(t('weight.saved'));
    router.back();
  };

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        <Button label={t('common.save')} onPress={save} disabled={!valid} testID="weight-save" />
      }
    >
      <View style={styles.header}>
        <IconButton
          icon="close"
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
        />
        <AppText variant="heading">{t('weight.title')}</AppText>
      </View>
      <BigNumberInput
        value={text}
        onChangeText={setText}
        unit={units === 'imperial' ? 'lb' : 'kg'}
        accessibilityLabel={t('weight.title')}
        autoFocus
        testID="weight-modal-input"
      />
      <AppText variant="caption" color="textMuted" align="center">
        {t('weight.tip')}
      </AppText>
      {weights.data?.length ? (
        <Card padded={false}>
          {[...weights.data]
            .reverse()
            .slice(0, 30)
            .map((w) => {
              const f = formatWeight(w.weight_kg, units);
              return (
                <ListRow
                  key={w.id}
                  title={`${f.value} ${f.unit}`}
                  subtitle={formatDay(w.local_date)}
                  right={
                    <IconButton
                      icon="trash-outline"
                      color="textMuted"
                      accessibilityLabel={t('common.delete')}
                      onPress={() =>
                        Alert.alert(t('weight.deleteTitle'), undefined, [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('common.delete'),
                            style: 'destructive',
                            onPress: () => deleteWeight(w.id),
                          },
                        ])
                      }
                    />
                  }
                />
              );
            })}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
