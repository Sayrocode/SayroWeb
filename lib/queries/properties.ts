import { QueryClient, useQuery } from '@tanstack/react-query';

export type PropertyResponse = any; // use existing shapes; kept flexible to avoid drift

const defaultDetailStale = 10 * 60_000; // 10 minutes
const defaultDetailGc = 30 * 60_000; // 30 minutes

export function propertyQueryKey(id: string | number) {
  return ['property', String(id)];
}

export async function fetchProperty(id: string | number): Promise<PropertyResponse> {
  const res = await fetch(`/api/properties/${encodeURIComponent(String(id))}`);
  if (!res.ok) throw new Error(`Failed to fetch property ${id}`);
  return res.json();
}

export function usePropertyQuery(id: string | number, initialData?: PropertyResponse) {
  return useQuery({
    queryKey: propertyQueryKey(id),
    queryFn: () => fetchProperty(id),
    staleTime: defaultDetailStale,
    gcTime: defaultDetailGc,
    initialData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
    notifyOnChangeProps: ['data', 'status'],
    enabled: Boolean(id),
  });
}

export async function prefetchProperty(queryClient: QueryClient, id: string | number) {
  return queryClient.prefetchQuery({
    queryKey: propertyQueryKey(id),
    queryFn: () => fetchProperty(id),
    staleTime: defaultDetailStale,
    gcTime: defaultDetailGc,
  });
}
