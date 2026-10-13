import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Button,
  Card,
  Icon,
  IconButton,
  Screen,
  ScreenHeader,
  TextField,
} from '@/components';
import { DoseSection } from '@/features/supplements/components/DoseSection';
import { NutritionSection } from '@/features/supplements/components/NutritionSection';
import { PresetPicker } from '@/features/supplements/components/PresetPicker';
import { ScheduleSection } from '@/features/supplements/components/ScheduleSection';
import { StockSection } from '@/features/supplements/components/StockSection';
import { SwitchRow } from '@/features/supplements/components/SwitchRow';
import { useSupplement } from '@/features/supplements/hooks';
import { useSupplementForm } from '@/features/supplements/useSupplementForm';
import type { SupplementRecord } from '@/services/db/types';
import { spacing } from '@/theme';

export default function SupplementModal() {
  const params = useLocalSearchParams<{ id?: string }>();
  const existing = useSupplement(params.id);
  if (params.id && !existing.data) return null;
  return <SupplementForm initial={existing.data ?? null} />;
}

function SupplementForm({ initial }: { initial: SupplementRecord | null }) {
  const { t } = useTranslation();
  const form = useSupplementForm(initial);

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        <Button
          label={t('common.save')}
          onPress={form.save}
          disabled={!form.valid}
          testID="supplement-save"
        />
      }
    >
      <ScreenHeader
        close
        title={initial ? t('supplements.editTitle') : t('supplements.newTitle')}
        right={
          initial ? (
            <IconButton
              icon="trash-outline"
              color="textMuted"
              accessibilityLabel={t('common.delete')}
              onPress={form.remove}
            />
          ) : undefined
        }
      />

      <TextField
        label={t('supplements.name')}
        placeholder={t('supplements.namePlaceholder')}
        value={form.name}
        onChangeText={form.changeName}
        maxLength={60}
        testID="supplement-name"
      />
      {!initial ? <PresetPicker value={form.preset} onPick={form.pickPreset} /> : null}

      <DoseSection form={form} />
      <ScheduleSection form={form} />
      <StockSection form={form} />
      <NutritionSection form={form} />

      {initial ? (
        <Card style={styles.group}>
          <SwitchRow
            label={t('supplements.active')}
            value={form.active}
            onChange={form.setActive}
            hint={t('supplements.activeHint')}
          />
        </Card>
      ) : null}

      <TextField
        label={t('supplements.note')}
        value={form.note}
        onChangeText={form.setNote}
        multiline
        maxLength={300}
      />
      <View style={styles.row}>
        <Icon name="information-circle-outline" size={18} color="textSubtle" />
        <AppText variant="caption" color="textSubtle" style={styles.flex}>
          {t('supplements.disclaimer')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  group: { gap: spacing.sm },
});
