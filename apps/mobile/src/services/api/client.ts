import NetInfo from '@react-native-community/netinfo';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { z } from 'zod';

import { requireSupabase } from '@/services/supabase/client';
import { ApiError } from './errors';

/**
 * Calls a Supabase Edge Function with the user's JWT and validates the response with Zod.
 * Error bodies follow `{ error: { code, message, details } }`.
 */
export async function invokeFunction<T>(
  name: string,
  body: unknown,
  schema?: z.ZodType<T>,
): Promise<T> {
  const net = await NetInfo.fetch();
  if (net.isConnected === false) throw new ApiError('OFFLINE', 0);

  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke(name, {
    body: body as Record<string, unknown>,
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      let payload: { error?: { code?: string; details?: Record<string, unknown> } } = {};
      try {
        payload = await res.json();
      } catch {
        // non-JSON error
      }
      throw new ApiError(
        (payload.error?.code as ApiError['code']) ?? 'INTERNAL',
        res.status,
        payload.error?.details,
      );
    }
    throw new ApiError('NETWORK', 0);
  }
  if (!schema) return data as T;
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError('AI_INVALID_RESPONSE', 200);
  return parsed.data;
}
