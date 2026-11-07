# Security review — current project revision

## Implemented in this revision

- Cloudflare Turnstile is rendered on public project requests, community idea submissions, and both administrator OTP steps.
- Server-side Siteverify is mandatory for those actions. Verification checks the Turnstile action, optionally pins the expected hostname, applies a timeout, and fails closed when the secret is missing or Cloudflare is unavailable.
- Replaced the fake text CAPTCHA in the project request form with Turnstile.
- Added per-request nonce-based Content Security Policy in middleware, including the required Cloudflare Turnstile, Supabase Realtime and Razorpay origins.
- Added `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and production HSTS.
- Middleware continues to refresh Supabase sessions while forwarding the nonce/CSP and updated auth cookies to the Next.js request.
- Guarded JSON write routes reject non-JSON content types and cross-site fetch metadata; origin mismatches are rejected.
- Administrator OTP input is validated, account creation is disabled, allowlist checks remain server-side, and the OTP endpoints use rate limiting plus Turnstile.
- Added six Node built-in security regression tests (`npm run test:security`).

## Required configuration before testing the protected flows

1. Create a Cloudflare Turnstile widget for each actual hostname.
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. The secret must stay server-only.
3. Set `TURNSTILE_EXPECTED_HOSTNAME` to the exact hostname for the deployment (for example `yourdomain.com`, without scheme or path). Leave it blank only if you intentionally do not want hostname pinning.
4. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Production write routes intentionally fail closed if Redis is unavailable.
5. Configure Supabase Auth SMTP and provider rate limits. Review the `admin_users` allowlist and all RLS policies.
6. Configure production Razorpay keys and webhook secret; test payment capture, duplicate callbacks, refunds and reconciliation in test mode first.

## Important limitations / remaining work

- Turnstile reduces automated submissions; it does not establish a real-world identity and does not replace authorization, rate limiting, moderation or fraud review.
- The community voter ID is browser-generated and can be reset. It discourages casual duplicate votes but is not proof of one person/one vote. Use authenticated community accounts and database-enforced user identity if voting integrity matters.
- The Content Security Policy is enforced, not report-only. Test every production route and third-party integration in staging; add narrowly scoped origins if a legitimate dependency is blocked. Avoid adding `unsafe-inline` to `script-src`.
- The automated tests are source-level regression checks, not end-to-end browser tests or a penetration test.
- No dependency install was completed in this environment. TypeScript checking, Next.js production build, `npm audit`, and OWASP ZAP were not run here. Run the commands in README after installing dependencies, then test a staging deployment.
- Review privacy/terms/refund pages, data retention, logging/monitoring, service-role access, and backup restoration before public launch.

## Rate-limit assumptions

The existing shared Redis limiter hashes the first address in `x-forwarded-for`. Deploy behind a trusted proxy that overwrites forwarding headers (for example Vercel/Cloudflare); do not expose the origin directly to untrusted traffic. Configure Supabase Auth's own rate limits as an independent control.

## Local Windows commands

Use `npm.cmd install`, `npm.cmd run typecheck`, `npm.cmd run test:security`, and `npm.cmd run dev` if PowerShell blocks `npm.ps1` execution.
