import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Button, Card, Screen, ScreenHeader, toast } from '@/components';
import { readSnapshot, snapshotFor } from '@/features/widgets/snapshot';
import { renderWidget, WIDGET_NAMES, type WidgetName } from '@/features/widgets/views';
import { radii, spacing } from '@/theme';
import { todayLocal } from '@/utils/dates';

const LIST: {
  name: WidgetName;
  key: 'voice' | 'water' | 'quick' | 'usual' | 'today';
  w: number;
  h: number;
}[] = [
  { name: WIDGET_NAMES.today, key: 'today', w: 320, h: 180 },
  { name: WIDGET_NAMES.usual, key: 'usual', w: 320, h: 180 },
  { name: WIDGET_NAMES.water, key: 'water', w: 250, h: 76 },
  { name: WIDGET_NAMES.quick, key: 'quick', w: 170, h: 76 },
  { name: WIDGET_NAMES.voice, key: 'voice', w: 76, h: 76 },
];

/** "Widgets": preview of each home-screen widget and a button to add it (Android launchers). */
export default function Widgets() {
  const { t } = useTranslation();
  const android = Platform.OS === 'android';
  const snapshot = snapshotFor(todayLocal(), readSnapshot());

  const add = async (name: WidgetName) => {
    try {
      const { requestPinWidget } = await import('react-native-android-widget');
      const ok = await requestPinWidget({ widgetName: name });
      if (!ok) toast.info(t('widgets.manual'));
    } catch {
      // Launcher without pin support (or module missing): fall back to manual instructions.
      toast.info(t('widgets.manual'));
    }
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title={t('widgets.title')} />
      <AppText color="textMuted">{t('widgets.intro')}</AppText>
      {!android ? <Banner tone="info" message={t('widgets.androidOnly')} /> : null}
      {LIST.map((w) => (
        <Card key={w.name} style={styles.card}>
          {android ? <Preview name={w.name} width={w.w} height={w.h} snapshot={snapshot} /> : null}
          <View style={styles.text}>
            <AppText variant="subheading">{t(`widgets.${w.key}.title`)}</AppText>
            <AppText variant="label" color="textMuted">
              {t(`widgets.${w.key}.body`)}
            </AppText>
          </View>
          {android ? (
            <Button
              label={t('widgets.add')}
              icon="add"
              variant="secondary"
              size="md"
              onPress={() => add(w.name)}
            />
          ) : null}
        </Card>
      ))}
      <AppText variant="caption" color="textSubtle">
        {t('widgets.manual')}
      </AppText>
    </Screen>
  );
}

function Preview({
  name,
  width,
  height,
  snapshot,
}: {
  name: WidgetName;
  width: number;
  height: number;
  snapshot: ReturnType<typeof snapshotFor>;
}) {
  // Loaded lazily: the native preview only exists on Android.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WidgetPreview } = require('react-native-android-widget');
  const drawn = renderWidget(name, snapshot, width, height) as { dark: React.JSX.Element };
  return (
    <View style={[styles.preview, { width, height }]}>
      <WidgetPreview renderWidget={() => drawn.dark} width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, alignItems: 'flex-start' },
  text: { gap: 2, alignSelf: 'stretch' },
  preview: { borderRadius: radii.xxl, overflow: 'hidden' },
});
