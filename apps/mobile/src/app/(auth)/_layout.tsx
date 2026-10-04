import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/stores/session';

export default function AuthLayout() {
  const status = useSessionStore((s) => s.status);
  // Guests may open sign-up: their local data is adopted by the new account.
  if (status === 'authenticated') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
