import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useProfile } from '@/features/profile/hooks';
import { useSessionStore } from '@/stores/session';
import { useTheme } from '@/theme';

/** Entry gate: auth → onboarding → app. */
export default function Index() {
  const status = useSessionStore((s) => s.status);
  const profile = useProfile();
  const { colors } = useTheme();

  if (status === 'signedOut' || status === 'loading') return <Redirect href="/welcome" />;
  if (profile.isLoading) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  if (!profile.data?.onboarding_completed) return <Redirect href="/onboarding" />;
  return <Redirect href="/today" />;
}
