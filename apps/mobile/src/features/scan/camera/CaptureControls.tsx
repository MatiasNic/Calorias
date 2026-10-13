import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components';
import { overlay, palette } from '@/theme';

import type { ScanBusy, ScanMode } from './types';

/** Gallery button and shutter (or the barcode indicator, which scans on its own). */
export function CaptureControls({
  mode,
  busy,
  onGallery,
  onCapture,
}: {
  mode: ScanMode;
  busy: ScanBusy;
  onGallery: () => void;
  onCapture: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.controls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('scan.gallery')}
        onPress={onGallery}
        disabled={mode === 'barcode' || !!busy}
        style={[
          styles.gallery,
          {
            backgroundColor: palette.cameraButton,
            opacity: mode === 'barcode' || busy ? 0.4 : 1,
          },
        ]}
      >
        <Icon name="photo_library" size={24} rawColor={overlay.text} />
      </Pressable>
      {mode !== 'barcode' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('scan.capture')}
          onPress={onCapture}
          disabled={!!busy}
          accessibilityState={{ disabled: !!busy }}
          style={[styles.shutter, { opacity: busy ? 0.5 : 1 }]}
          testID="scan-capture"
        >
          {busy === 'capture' ? (
            <ActivityIndicator color={overlay.text} />
          ) : (
            <View style={[styles.shutterInner, { backgroundColor: overlay.active }]} />
          )}
        </Pressable>
      ) : (
        <View style={styles.shutterPlaceholder}>
          <Icon name="barcode_scanner" size={34} rawColor={overlay.text} />
        </View>
      )}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  gallery: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: overlay.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31 },
  shutterPlaceholder: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 52 },
});
