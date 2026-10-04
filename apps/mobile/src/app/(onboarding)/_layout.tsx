import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/stores/session';

export default function OnboardingLayout() {
  const status = useSessionStore((s) => s.status);
  if (status === 'signedOut') return <Redirect href="/welcome" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
