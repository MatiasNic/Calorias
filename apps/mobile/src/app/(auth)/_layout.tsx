import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/stores/session';

export default function AuthLayout() {
  const status = useSessionStore((s) => s.status);
  if (status === 'authenticated' || status === 'guest') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
