import type { ApiErrorCode } from './shared/index.ts';
import type { z } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    public details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders, ...extra },
  });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) {
    return json(
      { error: { code: e.code, message: e.message, details: e.details ?? null } },
      e.status,
    );
  }
  console.error('unhandled error', e);
  return json({ error: { code: 'INTERNAL', message: 'Internal error', details: null } }, 500);
}

/** Wraps a handler with CORS preflight, method check and uniform error responses. */
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST')
      return json({ error: { code: 'INVALID_INPUT', message: 'POST only' } }, 405);
    try {
      return await fn(req);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, 'INVALID_INPUT', { reason: 'invalid_json' });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(400, 'INVALID_INPUT', {
      issues: parsed.error.issues.slice(0, 5).map((i) => i.path.join('.')),
    });
  }
  return parsed.data;
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1]!.trim() : null;
}
