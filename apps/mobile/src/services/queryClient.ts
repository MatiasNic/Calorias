import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { dbEvents } from '@/services/db/repository';
import { useUiStore } from '@/stores/ui';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
});

/** Local DB queries are keyed by collection name first, so any write invalidates them. */
dbEvents.subscribe((collection) => {
  queryClient.invalidateQueries({ queryKey: ['db', collection] });
  queryClient.invalidateQueries({ queryKey: ['derived'] });
  // Progress, weekly summary, adaptive goal and the diary calendar are keyed under 'meals' but
  // also read weights and goals.
  if (collection === 'weight' || collection === 'goals' || collection === 'profile')
    queryClient.invalidateQueries({ queryKey: ['db', 'meals'] });
  // Achievement stats read almost every collection.
  queryClient.invalidateQueries({ queryKey: ['db', 'achievements', 'stats'] });
  queryClient.invalidateQueries({ queryKey: ['db', 'pending'] });
});

/** A new day invalidates everything that computes "today" inside its fetch. */
useUiStore.subscribe((s, prev) => {
  if (s.knownToday !== prev.knownToday) queryClient.invalidateQueries({ queryKey: ['db'] });
});

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

AppState.addEventListener('change', (status) => {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
});
