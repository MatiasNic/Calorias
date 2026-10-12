import { suggestMealType } from '@plato/shared';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, IconButton, toast } from '@/components';
import { env } from '@/config/env';
import { useCustomFoodPrefill } from '@/features/foods/customFoodPrefill';
import { usePickerStore } from '@/features/foods/pickerStore';
import { lookupBarcode } from '@/features/foods/remote';
import { useScanStore } from '@/features/scan/store';
import { useAiError } from '@/features/scan/useAiError';
import { useDictation } from '@/features/scan/useDictation';
import { useQuotaStatus } from '@/features/scan/useQuota';
import { aiAvailable, readNutritionLabel } from '@/services/ai';
import { track } from '@/services/analytics';
import { prepareMealImage } from '@/services/image';
import { usePlan } from '@/services/purchases';
import { fontFamily, palette, radii, spacing, useTheme } from '@/theme';
import { useUiStore } from '@/stores/ui';
import { haptic } from '@/utils/haptics';

type Mode = 'photo' | 'barcode' | 'label' | 'text';
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;
/** The camera is always dark, whatever the app theme (design handoff). */
const CAMERA_ACTIVE = '#ECEEE9';
const CAMERA_TEXT_MUTED = '#C9CDCA';
const QUICK_HINTS = ['noOil', 'homemade', 'small', 'shared'] as const;

export default function Scan() {
  const { t } = useTranslation();
  // Meals go to the day the user is looking at (Today/Diary), like text and search entries.
  const [entryDate] = useState(() => useUiStore.getState().selectedDate);
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ mode?: Mode; code?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode ?? 'photo');
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState<null | 'barcode' | 'label' | 'capture' | 'gallery'>(null);
  // One photo per visit: a second capture/pick while leaving used to replace the first mid-analysis.
  const leaving = useRef(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  // Optional words about the photo ("es de pollo, sin aceite") that guide the AI.
  const [hint, setHint] = useState('');
  const hintRef = useRef('');
  useEffect(() => {
    hintRef.current = hint;
  }, [hint]);
  const hintDictation = useDictation(() => hintRef.current, setHint);
  const addHint = (words: string) =>
    setHint((h) => (h.trim() ? `${h.trim().replace(/[,.]$/, '')}, ${words.toLowerCase()}` : words));
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
    if (leaving.current) return;
    leaving.current = true;
    useScanStore.getState().setPhoto({ uri, width, height }, null, entryDate);
    useScanStore.getState().setHint(hint.trim() || null);
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
    if (!camera.current || busy || leaving.current) return;
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
    if (busy || needsAccount()) return;
    // Block the shutter while the picker is open and the chosen photo is being handed over.
    setBusy('gallery');
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      const asset = res.canceled ? null : res.assets[0];
      if (!asset) return;
      if (mode === 'label') await onLabel(asset.uri, asset.width, asset.height);
      else goReview(asset.uri, asset.width, asset.height);
    } finally {
      setBusy((b) => (b === 'gallery' ? null : b));
    }
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
          date: entryDate,
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

  if (mode === 'text')
    return <Redirect href={{ pathname: '/listen', params: { date: entryDate } }} />;

  if (!permission) return <View style={[styles.flex, { backgroundColor: '#000' }]} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <IconButton
          icon="close"
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
        />
        <View style={styles.permission}>
          <View style={[styles.permissionIcon, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name="camera-outline" size={28} color="text" />
          </View>
          <AppText variant="title">{t('scan.permissionTitle')}</AppText>
          <AppText color="textMuted">{t('scan.permissionBody')}</AppText>
        </View>
        <View style={styles.permissionActions}>
          <Button
            label={permission.canAskAgain ? t('scan.permissionCta') : t('scan.openSettings')}
            onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          />
          <Button
            label={t('scan.textInstead')}
            variant="ghost"
            size="md"
            onPress={() => router.replace({ pathname: '/text-log', params: { date: entryDate } })}
          />
        </View>
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            <View style={[styles.frame, mode === 'barcode' && styles.frameBarcode]}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>
            <AppText align="center" style={[styles.white, styles.hint]}>
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

          <View style={[styles.bottom, { backgroundColor: palette.cameraSheet }]}>
            {mode === 'photo' ? (
              <>
                <View style={[styles.hintField, { backgroundColor: palette.cameraField }]}>
                  <Icon name="chat_bubble" size={20} rawColor={CAMERA_TEXT_MUTED} />
                  <TextInput
                    value={hint}
                    onChangeText={setHint}
                    placeholder={t('scan.hintPlaceholder')}
                    placeholderTextColor={CAMERA_TEXT_MUTED}
                    maxLength={300}
                    style={styles.hintInput}
                    accessibilityLabel={t('scan.hintLabel')}
                    returnKeyType="done"
                    testID="scan-hint"
                  />
                  {hintDictation.available ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('scan.hintVoice')}
                      onPress={hintDictation.listening ? hintDictation.stop : hintDictation.start}
                      style={[
                        styles.hintMic,
                        {
                          backgroundColor: hintDictation.listening
                            ? CAMERA_ACTIVE
                            : palette.cameraButton,
                        },
                      ]}
                    >
                      <Icon
                        name={hintDictation.listening ? 'stop_circle' : 'mic'}
                        size={20}
                        rawColor={hintDictation.listening ? palette.bgDark : '#FFFFFF'}
                      />
                    </Pressable>
                  ) : null}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickHints}
                >
                  {QUICK_HINTS.map((k) => (
                    <Pressable
                      key={k}
                      accessibilityRole="button"
                      onPress={() => addHint(t(`scan.quickHints.${k}`))}
                      style={[styles.quickHint, { backgroundColor: palette.cameraField }]}
                    >
                      <AppText variant="label" style={styles.cameraText}>
                        + {t(`scan.quickHints.${k}`)}
                      </AppText>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}
            <View
              style={[styles.modes, { backgroundColor: palette.cameraField }]}
              accessibilityRole="tablist"
            >
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
                  style={[styles.mode, mode === m && { backgroundColor: CAMERA_ACTIVE }]}
                  testID={`scan-mode-${m}`}
                >
                  <AppText
                    variant="label"
                    style={{ color: mode === m ? palette.bgDark : CAMERA_TEXT_MUTED }}
                  >
                    {t(`scan.modes.${m}`)}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('scan.gallery')}
                onPress={pickFromGallery}
                disabled={mode === 'barcode' || !!busy}
                style={[
                  styles.gallery,
                  {
                    backgroundColor: palette.cameraButton,
                    opacity: mode === 'barcode' || busy ? 0.4 : 1,
                  },
                ]}
              >
                <Icon name="photo_library" size={24} rawColor="#FFFFFF" />
              </Pressable>
              {mode !== 'barcode' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('scan.capture')}
                  onPress={capture}
                  disabled={!!busy}
                  accessibilityState={{ disabled: !!busy }}
                  style={[styles.shutter, { opacity: busy ? 0.5 : 1 }]}
                  testID="scan-capture"
                >
                  {busy === 'capture' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={[styles.shutterInner, { backgroundColor: CAMERA_ACTIVE }]} />
                  )}
                </Pressable>
              ) : (
                <View style={styles.shutterPlaceholder}>
                  <Icon name="barcode_scanner" size={34} rawColor="#FFFFFF" />
                </View>
              )}
              <View style={styles.spacer} />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CORNER = 40;
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md,
    height: 32,
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  white: { color: '#fff' },
  cameraText: { color: '#E5E7E3' },
  center: { alignItems: 'center', gap: spacing.lg },
  frame: { width: 300, height: 300 },
  frameBarcode: { height: 170 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#FFFFFF' },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 22 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 22 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 22 },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 22,
  },
  hint: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    paddingHorizontal: spacing.md,
  },
  sheet: { marginHorizontal: spacing.lg, gap: spacing.md },
  hintField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    borderRadius: 22,
    minHeight: 56,
  },
  hintInput: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    minHeight: 48,
    color: '#FFFFFF',
  },
  hintMic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickHints: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  quickHint: {
    height: 36,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  bottom: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: radii.xxxl,
    borderTopRightRadius: radii.xxxl,
  },
  modes: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: radii.pill,
    padding: 4,
  },
  permission: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  permissionIcon: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionActions: { padding: spacing.lg, gap: spacing.xs },
  mode: {
    paddingHorizontal: spacing.md + 2,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
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
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31 },
  shutterPlaceholder: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 52 },
});
