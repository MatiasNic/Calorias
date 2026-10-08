import { redirectParams } from '../auth';

describe('redirectParams', () => {
  it('reads the PKCE code from the query', () => {
    expect(redirectParams('bocado://auth/callback?code=abc123').code).toBe('abc123');
  });
  it('reads Supabase errors from the fragment, decoded', () => {
    const p = redirectParams(
      'bocado://auth/callback#error=invalid_request&error_description=Unsupported+provider%3A+provider+is+not+enabled',
    );
    expect(p.error).toBe('invalid_request');
    expect(p.error_description).toBe('Unsupported provider: provider is not enabled');
  });
  it('returns nothing for a bare URL', () => {
    expect(redirectParams('bocado://auth/callback')).toEqual({});
  });
});
