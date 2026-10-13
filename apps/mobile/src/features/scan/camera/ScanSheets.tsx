import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card } from '@/components';
import { spacing, useTheme } from '@/theme';

/** Progress card while a barcode is looked up or a nutrition label is read. */
export function ScanBusySheet({ kind }: { kind: 'barcode' | 'label' }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card style={styles.sheet}>
      <ActivityIndicator color={colors.primary} />
      <AppText align="center">
        {kind === 'barcode' ? t('scan.looking') : t('scan.labelReading')}
      </AppText>
    </Card>
  );
}

/** Options when a scanned barcode isn't in the food database. */
export function BarcodeNotFoundSheet({
  barcode,
  onScanLabel,
  onRetry,
}: {
  barcode: string;
  onScanLabel: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card style={styles.sheet}>
      <AppText variant="subheading">{t('scan.barcodeNotFound')}</AppText>
      <AppText color="textMuted">{t('scan.barcodeNotFoundBody')}</AppText>
      <Button label={t('scan.scanLabel')} icon="camera" onPress={onScanLabel} />
      <Button
        label={t('scan.createProduct')}
        variant="outline"
        onPress={() => router.replace({ pathname: '/custom-food', params: { barcode } })}
      />
      <Button label={t('common.retry')} variant="ghost" size="md" onPress={onRetry} />
    </Card>
  );
}

const styles = StyleSheet.create({
  sheet: { marginHorizontal: spacing.lg, gap: spacing.md },
});
