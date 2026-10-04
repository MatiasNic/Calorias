import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Card,
  Chip,
  ConfidenceBadge,
  EmptyState,
  ErrorState,
  ListRow,
  MacroBar,
  ProgressBar,
  ProgressRing,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  Stepper,
  TextField,
  toast,
} from '@/components';
import { usePrefsStore, type ThemePreference } from '@/stores/prefs';
import { spacing, typography, useTheme, type TypographyVariant } from '@/theme';

/** Hidden component catalog, only reachable in development builds. */
export default function ComponentCatalog() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themePref = usePrefsStore((s) => s.theme);
  const setPrefs = usePrefsStore((s) => s.set);
  const [grams, setGrams] = useState(150);
  const [chip, setChip] = useState(true);

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Screen>
      <AppText variant="title">{t('dev.catalog')}</AppText>
      <SegmentedControl<ThemePreference>
        value={themePref}
        onChange={(v) => setPrefs({ theme: v })}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
      <SectionHeader title="Typography" />
      {(Object.keys(typography) as TypographyVariant[]).map((v) => (
        <AppText key={v} variant={v}>
          {v} — Milanesa con puré
        </AppText>
      ))}
      <SectionHeader title="Buttons" />
      <Button label="Primary" icon="camera" onPress={() => toast.success('Guardado')} />
      <Button label="Secondary" variant="secondary" />
      <Button label="Outline" variant="outline" />
      <Button label="Ghost" variant="ghost" />
      <Button label="Danger" variant="danger" onPress={() => toast.error('Error')} />
      <Button label="Loading" loading />
      <SectionHeader title="Progress" />
      <Card style={styles.center}>
        <ProgressRing progress={0.68} accessibilityLabel="68%">
          <AppText variant="display">1.240</AppText>
          <AppText variant="caption" color="textMuted">
            kcal restantes
          </AppText>
        </ProgressRing>
      </Card>
      <Card style={styles.row}>
        <MacroBar label={t('macros.protein')} value={82} target={140} color={colors.protein} />
        <MacroBar label={t('macros.carbs')} value={160} target={220} color={colors.carbs} />
        <MacroBar label={t('macros.fat')} value={50} target={65} color={colors.fat} />
      </Card>
      <ProgressBar progress={0.4} />
      <SectionHeader title="Inputs" />
      <TextField label="Email" placeholder="vos@ejemplo.com" />
      <TextField
        label="Peso"
        suffix="kg"
        keyboardType="decimal-pad"
        error="Ingresá un valor válido"
      />
      <Stepper label="Gramos" value={grams} onChange={setGrams} unit="g" />
      <View style={styles.wrap}>
        <Chip label="Vegetariano" selected={chip} onPress={() => setChip(!chip)} />
        <Chip label="Sin TACC" icon="leaf" />
        <ConfidenceBadge confidence={0.9} />
        <ConfidenceBadge confidence={0.6} />
        <ConfidenceBadge confidence={0.3} />
      </View>
      <SectionHeader title="Feedback" />
      <Banner tone="info" message={t('common.disclaimer')} />
      <Banner tone="warning" title="Ritmo agresivo" message="Considerá un ritmo más gradual." />
      <Card padded={false}>
        <ListRow
          title="Notificaciones"
          subtitle="Recordatorios"
          icon="notifications"
          onPress={() => undefined}
        />
        <ListRow title="Eliminar cuenta" icon="trash" destructive onPress={() => undefined} />
      </Card>
      <Skeleton height={60} radius={16} />
      <EmptyState
        icon="restaurant"
        title="Todavía no registraste comidas"
        message="Sacale una foto a tu plato"
        actionLabel="Escanear"
        onAction={() => undefined}
      />
      <ErrorState onRetry={() => undefined} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
