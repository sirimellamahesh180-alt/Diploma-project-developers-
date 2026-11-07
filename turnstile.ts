import 'server-only';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type VerifyResponse = { success?: boolean; hostname?: string; action?: string; 'error-codes'?: string[] };

/** Fail closed when Turnstile is not configured or verification cannot be reached. */
export async function verifyTurnstile(token: unknown, request: Request, expectedAction?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || typeof token !== 'string' || token.length < 10 || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  const remoteIp = request.headers.get('cf-connecting-ip');
  if (remoteIp && /^[0-9a-f:.]+$/i.test(remoteIp)) body.set('remoteip', remoteIp);

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result = await response.json() as VerifyResponse;
    if (!result.success) return false;
    const expectedHost = process.env.TURNSTILE_EXPECTED_HOSTNAME;
    if (expectedHost && result.hostname !== expectedHost) return false;
    if (expectedAction && result.action !== expectedAction) return false;
    return true;
  } catch {
    return false;
  }
}
