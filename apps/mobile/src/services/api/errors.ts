import type { ApiErrorCode } from '@plato/shared';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode | 'NETWORK' | 'OFFLINE',
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export const isQuotaError = (e: unknown): e is ApiError =>
  e instanceof ApiError && e.code === 'QUOTA_EXCEEDED';
export const isPremiumError = (e: unknown): e is ApiError =>
  e instanceof ApiError && e.code === 'PREMIUM_REQUIRED';
