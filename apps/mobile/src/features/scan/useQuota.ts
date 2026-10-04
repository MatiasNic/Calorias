import { useQuery } from '@tanstack/react-query';

import { fetchQuotaStatus } from '@/services/ai';
import { usePlan } from '@/services/purchases';

export function useQuotaStatus() {
  const plan = usePlan();
  return useQuery({ queryKey: ['quota', plan], queryFn: fetchQuotaStatus, staleTime: 15_000 });
}
