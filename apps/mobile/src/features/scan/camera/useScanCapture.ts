import { suggestMealType, type IsoDate } from '@bocado/shared';
import { type BarcodeScanningResult, type CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components';
import { env } from '@/config/env';
import { useCustomFoodPrefill } from '@/features/foods/customFoodPrefill';
import { usePickerStore } from '@/features/foods/pickerStore';
import { lookupBarcode } from '@/features/foods/remote';
import { useScanStore } from '@/features/scan/store';
import { useAiError } from '@/features/scan/useAiError';
import { aiAvailable, readNutritionLabel } from '@/services/ai';
import { track } from '@/services/analytics';
import { prepareMealImage } from '@/services/image';
import { haptic } from '@/utils/haptics';

import type { ScanBusy, ScanMode } from './types';

interface Options {
  mode: ScanMode;
  /** Day the meal goes to. */
  entryDate: IsoDate;
  /** Words about the photo, handed to the review with it. */
  hint: string;
  /** Demo-only simulated barcode (deep link `?code=`). */
  testCode?: string;
}

/**
 * Camera actions of the scan screen: shutter, gallery, barcode lookup and nutrition label
 * reading, with their busy and "barcode not found" state.
 */
export function useScanCapture({ mode, entryDate, hint, testCode }: Options) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<ScanBusy>(null);
  // One photo per visit: a second capture/pick while leaving used to replace the first mid-analysis.
  const leaving = useRef(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  const camera = useRef<CameraView>(null);
  const lastCode = useRef<string | null>(null);
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

  /** Forgets the last scanned barcode so the same code can be scanned again. */
  const resetBarcode = () => {
    setNotFound(null);
    lastCode.current = null;
  };

  // Test hook (demo builds only): bocado://scan?mode=barcode&code=… simulates a scanned barcode
  // so E2E tests can cover the barcode flow without a physical camera.
  useEffect(() => {
    const code = testCode;
    if (!env.useMocks || !code || !/^\d{6,14}$/.test(code)) return;
    const id = setTimeout(() => onBarcode({ data: code } as BarcodeScanningResult), 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testCode]);

  return { camera, busy, notFound, capture, pickFromGallery, onBarcode, resetBarcode };
}
