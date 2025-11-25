import { QueryClient, QueryClientProvider, HydrationBoundary, type DehydratedState } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ReactNode, useMemo, useState } from 'react';

type QueryProviderProps = {
  children: ReactNode;
  dehydratedState?: DehydratedState;
};

function createClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // general default; override per-query as needed
        gcTime: 30 * 60_000, // survive route hops
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  if (typeof window !== 'undefined') {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
    });
    try {
      persistQueryClient({
        queryClient: client,
        persister,
        maxAge: 30 * 60_000, // keep cache for up to 30 minutes
      });
    } catch {
      /* ignore persistence failures */
    }
  }

  return client;
}

export function QueryProvider({ children, dehydratedState }: QueryProviderProps) {
  const [client] = useState(() => createClient());
  const hydrateState = useMemo(() => dehydratedState, [dehydratedState]);
  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={hydrateState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}

export type { DehydratedState };
