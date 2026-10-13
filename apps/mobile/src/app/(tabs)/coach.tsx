import { FlashList, type FlashListRef } from '@shopify/flash-list';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, DictateButton, IconButton } from '@/components';
import { TAB_BAR_HEIGHT } from '@/components/TabBar';
import { CoachHome } from '@/features/coach/CoachHome';
import { CoachText } from '@/features/coach/CoachText';
import {
  historyForServer,
  loadConversation,
  saveConversation,
  type CoachMsg,
} from '@/features/coach/conversation';
import { DishCard } from '@/features/coach/DishCard';
import { useAiError } from '@/features/scan/useAiError';
import { useQuotaStatus } from '@/features/scan/useQuota';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { aiAvailable, askCoach } from '@/services/ai';
import { track } from '@/services/analytics';
import { newId } from '@/services/db/repository';
import { prepareMealImage } from '@/services/image';
import { usePlan } from '@/services/purchases';
import { queryClient } from '@/services/queryClient';
import { fontFamily, radii, spacing, useTheme } from '@/theme';

type Photo = { uri: string; width: number; height: number; kind: 'fridge' | 'menu' };

/**
 * AI nutrition coach (its own tab). It knows the user's targets and what they ate today, and
 * proposes dishes that can be logged in one tap. Conversations stay on the device.
 */
export default function Coach() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const typing = useKeyboardVisible();
  const plan = usePlan();
  const quota = useQuotaStatus();
  const aiError = useAiError();
  const [messages, setMessagesState] = useState<CoachMsg[]>(loadConversation);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<FlashListRef<CoachMsg>>(null);

  const setMessages = (update: (m: CoachMsg[]) => CoachMsg[]) =>
    setMessagesState((m) => {
      const next = update(m);
      saveConversation(next);
      return next;
    });

  const send = async (text: string, photo?: Photo) => {
    const content = text.trim();
    if ((!content && !photo) || busy) return;
    if (aiAvailable() !== 'ok') {
      router.push('/sign-up');
      return;
    }
    const mine: CoachMsg = {
      id: newId(),
      role: 'user',
      content: content || t(photo?.kind === 'menu' ? 'coach.menuPhoto' : 'coach.fridgePhoto'),
    };
    const next = [...messages, mine];
    setMessages(() => next);
    setInput('');
    setBusy(true);
    setError(null);
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    try {
      const img = photo ? await prepareMealImage(photo.uri, photo.width, photo.height) : undefined;
      const res = await askCoach(
        historyForServer(next),
        img && photo ? { img, kind: photo.kind } : undefined,
      );
      track('coach_message');
      setMessages((m) => [
        ...m,
        { id: newId(), role: 'assistant', content: res.reply, dishes: res.dishes },
      ]);
      queryClient.invalidateQueries({ queryKey: ['quota'] });
    } catch (e) {
      setError(aiError(e));
      setMessages((m) => m.filter((x) => x.id !== mine.id));
      setInput(content);
    } finally {
      setBusy(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const takePhoto = async (kind: Photo['kind']) => {
    if (plan !== 'premium') {
      router.push({ pathname: '/paywall', params: { context: 'feature' } });
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    const a = res.canceled ? null : res.assets[0];
    if (a)
      await send(input || t(kind === 'menu' ? 'coach.menuAsk' : 'coach.fridgeAsk'), {
        uri: a.uri,
        width: a.width,
        height: a.height,
        kind,
      });
  };

  const restart = () =>
    Alert.alert(t('coach.newChatTitle'), t('coach.newChatBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('coach.newChat'),
        onPress: () => {
          setMessages(() => []);
          setError(null);
        },
      },
    ]);

  const q = quota.data;
  const info =
    plan === 'premium'
      ? q
        ? t('coach.leftToday', { count: q.coach_message.remaining })
        : null
      : q && q.coach_trial_remaining > 0
        ? t('coach.trialLeft')
        : t('coach.trialUsed');
  // Room for the floating tab bar (hidden while typing).
  const bottom = typing ? 0 : TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing.md);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="title" accessibilityRole="header">
            {t('coach.tabTitle')}
          </AppText>
          {info ? (
            <AppText variant="caption" color="textMuted">
              {info}
            </AppText>
          ) : null}
        </View>
        {messages.length ? (
          <IconButton
            icon="edit_square"
            accessibilityLabel={t('coach.newChat')}
            onPress={restart}
            testID="coach-new-chat"
          />
        ) : null}
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
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            messages.length ? null : (
              <View style={styles.home}>
                <CoachHome onAsk={(text) => send(text)} onPhoto={takePhoto} busy={busy} />
                <AppText variant="caption" color="textSubtle">
                  {t('coach.disclaimer')}
                </AppText>
              </View>
            )
          }
          renderItem={({ item }) =>
            item.role === 'user' ? (
              <View style={[styles.bubble, styles.mine, { backgroundColor: colors.primary }]}>
                <AppText color="onPrimary" selectable>
                  {item.content}
                </AppText>
              </View>
            ) : (
              <View style={styles.theirs}>
                <View
                  style={[
                    styles.bubble,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    styles.bordered,
                  ]}
                >
                  <CoachText text={item.content} color="text" />
                </View>
                {item.dishes?.map((d, i) => (
                  <DishCard key={`${item.id}-${i}`} dish={d} />
                ))}
              </View>
            )
          }
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
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              marginBottom: bottom,
            },
          ]}
        >
          <IconButton
            icon="camera"
            accessibilityLabel={t('coach.fridgePhoto')}
            onPress={() => takePhoto('fridge')}
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
            testID="coach-input"
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
          />
          {input.trim() ? null : (
            <DictateButton value={input} onChangeText={setInput} size={44} testID="coach-mic" />
          )}
          <IconButton
            icon="send"
            accessibilityLabel={t('coach.send')}
            onPress={() => send(input)}
            disabled={!input.trim() || busy}
            color="primary"
            testID="coach-send"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  list: { padding: spacing.lg },
  home: { gap: spacing.md, marginBottom: spacing.lg },
  bubble: {
    maxWidth: '88%',
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
  },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'stretch' },
  bordered: { borderWidth: 1, alignSelf: 'flex-start' },
  thinking: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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
