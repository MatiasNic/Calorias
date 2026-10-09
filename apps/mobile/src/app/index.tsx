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

  const blank = <View style={{ flex: 1, backgroundColor: colors.background }} />;
  // While the session is restoring, or the profile is refreshing right after onboarding/sign-up,
  // wait instead of redirecting: an early redirect flashes the welcome/onboarding screen.
  if (status === 'loading') return blank;
  if (status === 'signedOut') return <Redirect href="/welcome" />;
  if (profile.isLoading || (profile.isFetching && !profile.data?.onboarding_completed))
    return blank;
  if (!profile.data?.onboarding_completed) return <Redirect href="/onboarding" />;
  return <Redirect href="/today" />;
}
