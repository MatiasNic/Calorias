import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { dbEvents } from '@/services/db/repository';

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
});

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

AppState.addEventListener('change', (status) => {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
});
