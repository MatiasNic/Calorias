import { FlashList, type FlashListRef } from '@shopify/flash-list';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Chip, IconButton, ScreenHeader } from '@/components';
import { useAiError } from '@/features/scan/useAiError';
import { useQuotaStatus } from '@/features/scan/useQuota';
import { aiAvailable, askCoach } from '@/services/ai';
import { track } from '@/services/analytics';
import { newId } from '@/services/db/repository';
import { prepareMealImage } from '@/services/image';
import { usePlan } from '@/services/purchases';
import { queryClient } from '@/services/queryClient';
import { fontFamily, radii, spacing, useTheme } from '@/theme';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/** AI nutrition coach. Conversations stay on the device (not stored on the server). */
export default function Coach() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const plan = usePlan();
  const quota = useQuotaStatus();
  const aiError = useAiError();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<FlashListRef<Msg>>(null);

  const send = async (
    text: string,
    photo?: { uri: string; width: number; height: number; kind: 'fridge' | 'menu' },
  ) => {
    const content = text.trim();
    if ((!content && !photo) || busy) return;
    if (aiAvailable() !== 'ok') {
      router.replace('/sign-up');
      return;
    }
    const next: Msg[] = [
      ...messages,
      { id: newId(), role: 'user', content: content || t('coach.fridgePhoto') },
    ];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const img = photo ? await prepareMealImage(photo.uri, photo.width, photo.height) : undefined;
      const res = await askCoach(
        next.map(({ role, content: c }) => ({ role, content: c })),
        img && photo ? { img, kind: photo.kind } : undefined,
      );
      track('coach_message');
      setMessages((m) => [...m, { id: newId(), role: 'assistant', content: res.reply }]);
      queryClient.invalidateQueries({ queryKey: ['quota'] });
    } catch (e) {
      setError(aiError(e));
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const fridge = async () => {
    if (plan !== 'premium') {
      router.push({ pathname: '/paywall', params: { context: 'feature' } });
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    const a = res.canceled ? null : res.assets[0];
    if (a)
      await send(input || t('coach.starters.fridge'), {
        uri: a.uri,
        width: a.width,
        height: a.height,
        kind: 'fridge',
      });
  };

  const q = quota.data;
  const info =
    plan === 'premium'
      ? q
        ? t('coach.leftToday', { count: q.coach_message.remaining })
        : null
      : q && q.coach_trial_remaining > 0
        ? t('coach.trialLeft')
        : t('coach.trialUsed');

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.pad}>
        <ScreenHeader
          title={t('coach.title')}
          close
          right={
            <IconButton
              icon="calendar"
              accessibilityLabel={t('coach.mealPlan')}
              onPress={() => router.push('/meal-plan')}
            />
          }
        />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlashList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.headerBox}>
              <AppText color="textMuted">{t('coach.subtitle')}</AppText>
              <Banner tone="info" message={t('coach.disclaimer')} />
              {info ? (
                <AppText variant="caption" color="textMuted">
                  {info}
                </AppText>
              ) : null}
              {!messages.length ? (
                <View style={styles.chips}>
                  {(['dinner', 'fridge', 'snack'] as const).map((k) => (
                    <Chip
                      key={k}
                      label={t(`coach.starters.${k}`)}
                      onPress={() => send(t(`coach.starters.${k}`))}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === 'user'
                  ? { alignSelf: 'flex-end', backgroundColor: colors.primary }
                  : {
                      alignSelf: 'flex-start',
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
              ]}
            >
              <AppText color={item.role === 'user' ? 'onPrimary' : 'text'} selectable>
                {item.content}
              </AppText>
            </View>
          )}
          ListFooterComponent={
            busy ? (
              <View style={styles.thinking}>
                <ActivityIndicator color={colors.primary} />
                <AppText color="textMuted">{t('coach.thinking')}</AppText>
              </View>
            ) : error ? (
              <Banner tone="danger" message={error} />
            ) : null
          }
        />
        <View
          style={[
            styles.inputRow,
            { borderTopColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <IconButton
            icon="camera"
            accessibilityLabel={t('coach.fridgePhoto')}
            onPress={fridge}
            color="primary"
          />
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('coach.placeholder')}
            placeholderTextColor={colors.textSubtle}
            multiline
            maxLength={1000}
            accessibilityLabel={t('coach.placeholder')}
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
          />
          <IconButton
            icon="send"
            accessibilityLabel={t('coach.send')}
            onPress={() => send(input)}
            disabled={!input.trim() || busy}
            color="primary"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: spacing.lg },
  list: { padding: spacing.lg },
  headerBox: { gap: spacing.md, marginBottom: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
  },
  thinking: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    padding: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.regular,
    fontSize: 16,
  },
});
