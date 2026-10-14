import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useSessionStore } from '@/stores/session';

export default function TabsLayout() {
  const status = useSessionStore((s) => s.status);
  if (status === 'signedOut') return <Redirect href="/welcome" />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
      // Android back from any other tab (or the hidden Perfil) returns to Hoy, the first
      // route, before leaving the app.
      backBehavior="firstRoute"
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="diary" />
      <Tabs.Screen name="scan-tab" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
