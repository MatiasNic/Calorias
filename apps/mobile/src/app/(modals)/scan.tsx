import { CameraView, useCameraPermissions } from 'expo-camera';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { CameraPermission } from '@/features/scan/camera/CameraPermission';
import { CameraTopBar } from '@/features/scan/camera/CameraTopBar';
import { CaptureControls } from '@/features/scan/camera/CaptureControls';
import { HintComposer } from '@/features/scan/camera/HintComposer';
import { ModeTabs } from '@/features/scan/camera/ModeTabs';
import { ScanFrame } from '@/features/scan/camera/ScanFrame';
import { BarcodeNotFoundSheet, ScanBusySheet } from '@/features/scan/camera/ScanSheets';
import { BARCODE_TYPES, type ScanMode } from '@/features/scan/camera/types';
import { useScanCapture } from '@/features/scan/camera/useScanCapture';
import { useScanHint } from '@/features/scan/camera/useScanHint';
import { useQuotaStatus } from '@/features/scan/useQuota';
import { usePlan } from '@/services/purchases';
import { overlay, palette, radii, spacing } from '@/theme';
import { useUiStore } from '@/stores/ui';

export default function Scan() {
  const { t } = useTranslation();
  // Meals go to the day the user is looking at (Today/Diary), like text and search entries.
  const [entryDate] = useState(() => useUiStore.getState().selectedDate);
  const params = useLocalSearchParams<{ mode?: ScanMode; code?: string }>();
  const [mode, setMode] = useState<ScanMode>(params.mode ?? 'photo');
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const hintState = useScanHint();
  const { camera, busy, notFound, capture, pickFromGallery, onBarcode, resetBarcode } =
    useScanCapture({ mode, entryDate, hint: hintState.hint, testCode: params.code });
  const quota = useQuotaStatus();
  const plan = usePlan();

  if (mode === 'text')
    return <Redirect href={{ pathname: '/listen', params: { date: entryDate } }} />;

  if (!permission) return <View style={[styles.flex, { backgroundColor: overlay.background }]} />;
  if (!permission.granted) {
    return (
      <CameraPermission
        permission={permission}
        requestPermission={requestPermission}
        entryDate={entryDate}
      />
    );
  }

  const photoQuota = quota.data?.photo_scan;
  const quotaLabel =
    mode === 'photo' && photoQuota
      ? plan === 'premium'
        ? t('scan.quotaUnlimited')
        : t('scan.quotaLeft', { count: photoQuota.remaining })
      : null;
  const guide =
    mode === 'barcode'
      ? t('scan.guideBarcode')
      : mode === 'label'
        ? t('scan.guideLabel')
        : t('scan.guide');

  return (
    <View style={[styles.flex, { backgroundColor: overlay.background }]} testID="scan-screen">
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={
          mode === 'barcode' ? { barcodeTypes: [...BARCODE_TYPES] } : undefined
        }
        onBarcodeScanned={mode === 'barcode' ? onBarcode : undefined}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          <CameraTopBar
            quotaLabel={quotaLabel}
            torch={torch}
            onToggleTorch={() => setTorch(!torch)}
          />

          <ScanFrame guide={guide} barcode={mode === 'barcode'} />

          {busy === 'barcode' || busy === 'label' ? <ScanBusySheet kind={busy} /> : null}

          {notFound ? (
            <BarcodeNotFoundSheet
              barcode={notFound}
              onScanLabel={() => setMode('label')}
              onRetry={resetBarcode}
            />
          ) : null}

          <View style={[styles.bottom, { backgroundColor: palette.cameraSheet }]}>
            {mode === 'photo' ? <HintComposer {...hintState} /> : null}
            <ModeTabs
              mode={mode}
              onChange={(m) => {
                resetBarcode();
                setMode(m);
              }}
            />
            <CaptureControls
              mode={mode}
              busy={busy}
              onGallery={pickFromGallery}
              onCapture={capture}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  bottom: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: radii.xxxl,
    borderTopRightRadius: radii.xxxl,
  },
});
