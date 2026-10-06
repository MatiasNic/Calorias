import { suggestMealType } from '@plato/shared';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, EmptyState, Icon, IconButton, toast } from '@/components';
import { env } from '@/config/env';
import { useCustomFoodPrefill } from '@/features/foods/customFoodPrefill';
import { usePickerStore } from '@/features/foods/pickerStore';
import { lookupBarcode } from '@/features/foods/remote';
import { useScanStore } from '@/features/scan/store';
import { useAiError } from '@/features/scan/useAiError';
import { useQuotaStatus } from '@/features/scan/useQuota';
import { aiAvailable, readNutritionLabel } from '@/services/ai';
import { track } from '@/services/analytics';
import { prepareMealImage } from '@/services/image';
import { usePlan } from '@/services/purchases';
import { radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { todayLocal } from '@/utils/dates';

type Mode = 'photo' | 'barcode' | 'label' | 'text';
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function Scan() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ mode?: Mode; code?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode ?? 'photo');
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState<null | 'barcode' | 'label' | 'capture'>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const camera = useRef<CameraView>(null);
  const lastCode = useRef<string | null>(null);
  const quota = useQuotaStatus();
  const plan = usePlan();
  const aiError = useAiError();

  const needsAccount = () => {
    if (aiAvailable() === 'ok') return false;
    toast.info(t('profile.createAccount'));
    router.replace('/sign-up');
    return true;
  };

  const goReview = (uri: string, width: number, height: number) => {
    useScanStore.getState().setPhoto({ uri, width, height });
    track('scan_started', { mode: 'photo' });
    router.replace('/scan-review');
  };

  const onLabel = async (uri: string, width: number, height: number) => {
    setBusy('label');
    try {
      const img = await prepareMealImage(uri, width, height, true);
      const res = await readNutritionLabel(img);
      if (!res.label.is_label || !res.label.per_100g) {
        toast.error(t('scan.labelFailed'));
        return;
      }
      useCustomFoodPrefill.getState().set({
        name: res.label.product_name ?? '',
        brand: res.label.brand,
        barcode: notFound,
        servingGrams: res.label.serving_size_g,
        per100g: res.label.per_100g,
        origin: 'label',
      });
      router.replace('/custom-food');
    } catch (e) {
      toast.error(aiError(e));
    } finally {
      setBusy(null);
    }
  };

  const capture = async () => {
    if (!camera.current || busy) return;
    if (mode !== 'barcode' && needsAccount()) return;
    haptic('medium');
    setBusy('capture');
    try {
      const pic = await camera.current.takePictureAsync({ quality: 0.85 });
      if (!pic) return;
      if (mode === 'label') await onLabel(pic.uri, pic.width, pic.height);
      else goReview(pic.uri, pic.width, pic.height);
    } catch {
      toast.error(t('common.errorMessage'));
    } finally {
      setBusy((b) => (b === 'capture' ? null : b));
    }
  };

  const pickFromGallery = async () => {
    if (needsAccount()) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;
    if (mode === 'label') await onLabel(asset.uri, asset.width, asset.height);
    else goReview(asset.uri, asset.width, asset.height);
  };

  const onBarcode = async ({ data }: BarcodeScanningResult) => {
    if (busy || notFound || lastCode.current === data) return;
    lastCode.current = data;
    haptic('success');
    setBusy('barcode');
    track('barcode_scanned');
    try {
      const food = await lookupBarcode(data);
      if (!food) {
        setNotFound(data);
        return;
      }
      const picker = usePickerStore.getState();
      if (!picker.target)
        picker.open({
          kind: 'diary',
          date: todayLocal(),
          mealType: suggestMealType(new Date().getHours()),
        });
      picker.select(food);
      router.replace('/food-detail');
    } catch {
      toast.error(t('common.errorMessage'));
      lastCode.current = null;
    } finally {
      setBusy(null);
    }
  };

  // Test hook (demo builds only): bocado://scan?mode=barcode&code=… simulates a scanned barcode
  // so E2E tests can cover the barcode flow without a physical camera.
  useEffect(() => {
    const code = params.code;
    if (!env.useMocks || !code || !/^\d{6,14}$/.test(code)) return;
    const id = setTimeout(() => onBarcode({ data: code } as BarcodeScanningResult), 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code]);

  if (mode === 'text') return <Redirect href="/text-log" />;

  if (!permission) return <View style={[styles.flex, { backgroundColor: '#000' }]} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <IconButton
          icon="close"
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
        />
        <EmptyState
          icon="camera"
          title={t('scan.permissionTitle')}
          message={t('scan.permissionBody')}
          actionLabel={permission.canAskAgain ? t('scan.permissionCta') : t('scan.openSettings')}
          onAction={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
        />
      </SafeAreaView>
    );
  }

  const photoQuota = quota.data?.photo_scan;
  const guide =
    mode === 'barcode'
      ? t('scan.guideBarcode')
      : mode === 'label'
        ? t('scan.guideLabel')
        : t('scan.guide');

  return (
    <View style={[styles.flex, { backgroundColor: '#000' }]} testID="scan-screen">
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
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <IconButton
            icon="close"
            rawWhite
            accessibilityLabel={t('common.close')}
            onPress={() => router.back()}
          />
          {mode === 'photo' && photoQuota ? (
            <View style={styles.pill}>
              <AppText variant="caption" style={styles.white}>
                {plan === 'premium'
                  ? t('scan.quotaUnlimited')
                  : t('scan.quotaLeft', { count: photoQuota.remaining })}
              </AppText>
            </View>
          ) : null}
          <IconButton
            icon={torch ? 'flash' : 'flash-off'}
            rawWhite
            accessibilityLabel={torch ? t('scan.flashOff') : t('scan.flashOn')}
            onPress={() => setTorch(!torch)}
          />
        </View>

        <View style={styles.center} pointerEvents="none">
          <View style={[styles.frame, mode === 'barcode' && styles.frameBarcode]} />
          <AppText variant="label" align="center" style={[styles.white, styles.hint]}>
            {guide}
          </AppText>
        </View>

        {busy === 'barcode' || busy === 'label' ? (
          <Card style={styles.sheet}>
            <ActivityIndicator color={colors.primary} />
            <AppText align="center">
              {busy === 'barcode' ? t('scan.looking') : t('scan.labelReading')}
            </AppText>
          </Card>
        ) : null}

        {notFound ? (
          <Card style={styles.sheet}>
            <AppText variant="subheading">{t('scan.barcodeNotFound')}</AppText>
            <AppText color="textMuted">{t('scan.barcodeNotFoundBody')}</AppText>
            <Button label={t('scan.scanLabel')} icon="camera" onPress={() => setMode('label')} />
            <Button
              label={t('scan.createProduct')}
              variant="outline"
              onPress={() =>
                router.replace({ pathname: '/custom-food', params: { barcode: notFound } })
              }
            />
            <Button
              label={t('common.retry')}
              variant="ghost"
              size="md"
              onPress={() => {
                setNotFound(null);
                lastCode.current = null;
              }}
            />
          </Card>
        ) : null}

        <View style={styles.bottom}>
          <View style={styles.modes} accessibilityRole="tablist">
            {(['photo', 'barcode', 'label', 'text'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                accessibilityLabel={t(`scan.modes.${m}`)}
                onPress={() => {
                  haptic('selection');
                  setNotFound(null);
                  lastCode.current = null;
                  setMode(m);
                }}
                style={[styles.mode, mode === m && { backgroundColor: 'rgba(255,255,255,0.22)' }]}
                testID={`scan-mode-${m}`}
              >
                <AppText variant="label" style={styles.white}>
                  {t(`scan.modes.${m}`)}
                </AppText>
              </Pressable>
            ))}
          </View>
          <View style={styles.controls}>
            <IconButton
              icon="images"
              rawWhite
              size={26}
              accessibilityLabel={t('scan.gallery')}
              onPress={pickFromGallery}
              disabled={mode === 'barcode'}
            />
            {mode !== 'barcode' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('scan.capture')}
                onPress={capture}
                style={styles.shutter}
                testID="scan-capture"
              >
                {busy === 'capture' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </Pressable>
            ) : (
              <View style={styles.shutterPlaceholder}>
                <Icon name="barcode-outline" size={34} rawColor="#fff" />
              </View>
            )}
            <View style={styles.spacer} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  pill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  white: { color: '#fff' },
  center: { alignItems: 'center', gap: spacing.md },
  frame: {
    width: '82%',
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.xxl,
  },
  frameBarcode: { aspectRatio: 1.8 },
  hint: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  sheet: { marginHorizontal: spacing.lg, gap: spacing.md },
  bottom: { gap: spacing.lg, paddingBottom: spacing.lg },
  modes: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radii.pill,
    padding: 4,
  },
  mode: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  shutterPlaceholder: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 48 },
});
