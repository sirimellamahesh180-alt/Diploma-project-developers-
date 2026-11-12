import 'server-only';
import crypto from 'node:crypto';

const RATE_LIMIT_SCRIPT = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n`;

/** Same-origin check plus a shared, atomic Redis fixed-window limiter. */
export async function guardRequest(req: Request, bucket: string, limit = 20, windowSeconds = 60): Promise<Response | null> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return Response.json({ error: 'Content-Type must be application/json.' }, { status: 415 });
  }
  if (req.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ error: 'Cross-site request rejected.' }, { status: 403 });
  }
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(req.url).origin) {
        return Response.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
      }
    } catch {
      return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    if (process.env.NODE_ENV === 'production') {
      return Response.json({ error: 'Security service is not configured.' }, { status: 503 });
    }
    return null;
  }

  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ipHash = crypto.createHash('sha256').update(forwarded).digest('hex').slice(0, 32);
  const key = `rl:${bucket}:${ipHash}`;
  try {
    const response = await fetch(`${redisUrl.replace(/\/$/, '')}/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', RATE_LIMIT_SCRIPT, '1', key, String(windowSeconds)]),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Rate limiter unavailable');
    const result = await response.json() as { result?: number };
    if (typeof result.result !== 'number') throw new Error('Invalid rate limiter response');
    if (result.result > limit) return Response.json({ error: 'Too many requests. Try again later.' }, { status: 429, headers: { 'Retry-After': String(windowSeconds) } });
    return null;
  } catch {
    // Fail closed in production: do not silently disable abuse protection.
    return Response.json({ error: 'Security service temporarily unavailable.' }, { status: 503 });
  }
}
