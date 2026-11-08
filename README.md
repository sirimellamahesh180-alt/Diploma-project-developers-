# Diploma Project Developers — Production Starter

A deployable Next.js App Router application for Diploma Project Developers. It uses Supabase PostgreSQL for durable records, Supabase Auth email OTP for admin sign-in, Resend for transactional notifications, and Razorpay Standard Checkout with server-side HMAC verification.

## Important: connect real services before public use

This repository contains production integration code, not your private provider credentials. A live deployment cannot send mail, authenticate against your Supabase project, or accept real payments until you create/configure the accounts and add the environment variables. Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, or `RESEND_API_KEY` in browser code.

## 1. Requirements

- Node.js 20.9+ (recommended), npm
- Supabase project
- Resend account and a verified sending domain
- Razorpay account (start with test keys)
- Vercel account (free `*.vercel.app` subdomain)

## 2. Database setup

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor** and run the complete `database/schema.sql` file.
3. In Supabase **Authentication → Providers → Email**, enable email OTP / passwordless sign-in. In **Authentication → Email Templates → Magic Link**, use an OTP template containing `{{ .Token }}` (for example: `Your Diploma Project Developers admin sign-in code is {{ .Token }}.`). This app asks the administrator to enter that code with `verifyOtp`, rather than clicking a magic link. Configure Auth rate limits as well.
4. In Supabase **Authentication → Users**, invite/create the administrator user for the email you control. Admin OTP is passwordless email OTP and `shouldCreateUser` is disabled, so the Auth user must already exist.
5. Add the same administrator email to the allowlist (only after verifying you control it):

```sql
insert into public.admin_users(email)
values ('sirimellamahesh180@gmail.com')
on conflict do nothing;
```

6. Copy Project URL, anon/publishable key and service-role key from Project Settings → API. The service-role key is server-only and bypasses RLS.

The API routes use a server-only service client after validating request data or checking the Supabase-authenticated user's email against `admin_users`. Browser users cannot query the tables directly. Do not grant public table privileges.

## 3. Email setup (Resend)

1. Create an account at https://resend.com and add a domain you own.
2. Publish the DNS records Resend provides and wait for domain verification.
3. Create an API key and set `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to an address on that verified domain, e.g. `Diploma Project Developers <notifications@yourdomain.com>`.
5. Set `NOTIFICATION_EMAIL=sirimellamahesh180@gmail.com`.

Supabase Auth sends admin one-time codes using the Supabase project's configured Auth email provider. Resend sends project request notifications and customer confirmations. These are separate email systems.

## 4. Razorpay setup

1. Create/activate your Razorpay account at https://dashboard.razorpay.com.
2. Configure business/KYC details and enable the payment methods you need (UPI/cards/netbanking).
3. Start with **Test Mode** API keys. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same test key id).
4. The request form captures an indicative budget only. An administrator must accept the request and enter a final quote in the Admin panel. Only then can a customer create a Razorpay order for that exact server-stored quote. An acceptance email includes a secure unguessable request-reference checkout link at `/pay/[request-id]`. The server verifies Razorpay's HMAC signature before marking the order paid.
5. Test success, failure, duplicate callbacks and refunds before enabling Live Mode. Replace all three values with live keys after account activation. Configure the Razorpay webhook URL as `https://YOUR_DOMAIN/api/payments/webhook`, subscribe to `payment.captured` and `order.paid`, and set the webhook secret as `RAZORPAY_WEBHOOK_SECRET`. The endpoint verifies the webhook HMAC before updating payment state.

The application never collects or stores card/UPI credentials. Checkout is hosted by Razorpay. Never mark a payment paid based only on the browser callback; the server verification endpoint is authoritative.

## Cloudflare Turnstile and browser security

1. In the Cloudflare dashboard, open **Turnstile** and create a widget for the exact hostnames you will use (for local testing include `localhost`; add your production domain separately).
2. Copy the **site key** into `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the **secret key** into `TURNSTILE_SECRET_KEY`. The site key is public; the secret key must never use a `NEXT_PUBLIC_` prefix.
3. Set `TURNSTILE_EXPECTED_HOSTNAME` to the exact hostname Cloudflare should report (for example, `example.com`, without `https://` or a path). If you omit it, Cloudflare signature/success verification still runs, but the hostname is not additionally pinned.
4. Project requests, community idea submissions, and both admin OTP steps render Turnstile in the browser. The server independently calls Cloudflare Siteverify, checks success/action and optionally hostname, and fails closed if the secret is absent or Cloudflare cannot be reached. Tokens are short-lived and single-use; complete a fresh challenge after a failed attempt.
5. For local UI development only, Cloudflare publishes test keys. Use the current keys from https://developers.cloudflare.com/turnstile/troubleshooting/testing/ and never deploy test keys.
6. Middleware creates a per-request nonce-based Content Security Policy and adds `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, and production HSTS. The CSP explicitly permits the Turnstile and Razorpay origins. Review the policy if you add another third-party script, image, font, or API.
7. Rate limiting remains mandatory. Configure Upstash before production; the existing limiter fails closed when its Redis service is missing or unavailable. Configure Supabase Auth rate limits as a second layer.

### Security checks

Run these commands before deployment:

```bash
npm run typecheck
npm run test:security
npm audit --omit=dev
npm run build
```

The automated security tests are regression checks for critical code paths and configuration; they are **not** a penetration test. Test the deployed site with OWASP ZAP, review Supabase RLS policies, and verify that only allowlisted users can use every admin endpoint.

## 5. Local development

```bash
cp .env.example .env.local
# Fill in the values from your provider dashboards
npm install
npm run dev
```

Open http://localhost:3000. To run a production build locally:

```bash
npm run typecheck
npm run build
npm start
```

## 6. Deploy to Vercel (free subdomain)

1. Push this folder to a private GitHub repository (or import the repository directly in Vercel).
2. In https://vercel.com/new import the repository. Framework preset: Next.js; build command: `next build`.
3. In Vercel → Project → Settings → Environment Variables, add every variable from `.env.example` for Production (and Preview if needed). `NEXT_PUBLIC_SITE_URL` should be the Vercel URL, e.g. `https://diploma-project-developers.vercel.app`.
4. Deploy. Vercel assigns a free `*.vercel.app` address. Add that URL to Supabase Auth → URL Configuration → Site URL and Redirect URLs.
5. Redeploy after changing environment variables.

## Environment variables

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Server-only privileged DB access |
| `RESEND_API_KEY` | Secret | Transactional email |
| `EMAIL_FROM` | Server config | Verified sender address |
| `NOTIFICATION_EMAIL` | Server config | Owner notification inbox |
| `RAZORPAY_KEY_ID` | Secret/server | Create Razorpay orders |
| `RAZORPAY_KEY_SECRET` | Secret | Verify checkout signature |
| `RAZORPAY_WEBHOOK_SECRET` | Secret | Verify Razorpay webhook events |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public | Razorpay Checkout key id |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical deployed URL |
| `UPSTASH_REDIS_REST_URL` | Server config | Shared rate-limit Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Secret | Shared rate-limit Redis token |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Cloudflare Turnstile widget |
| `TURNSTILE_SECRET_KEY` | Secret | Server-side Cloudflare Siteverify |
| `TURNSTILE_EXPECTED_HOSTNAME` | Server config | Optional exact hostname check |

## Features

- Responsive dark glassmorphism UI with motion effects and Lucide icons
- Multi-step project request flow with server-side Zod validation, a honeypot field and server-verified Cloudflare Turnstile
- Durable request records and owner/customer Resend notifications
- Supabase Auth email OTP admin login with Turnstile on both OTP steps and database allowlist authorization
- Admin request search, status management, quote setting and deletion
- Live announcement, community and admin request feeds backed by Supabase Realtime; verified admins can publish/delete
- Community idea submission with server-verified Cloudflare Turnstile, atomic database voting and persistent vote counts
- Razorpay order creation only for accepted + quoted requests; server-side HMAC verification
- Nonce-based CSP and baseline browser security headers; `/api/health` reports configuration readiness (never exposes secrets)

## Production hardening checklist

- Enable Supabase backups and review data retention/privacy obligations.
- Configure Supabase Auth SMTP/provider settings and email rate limits.
- Configure Upstash Redis REST credentials (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) before production. Write endpoints use a shared atomic rate limiter and fail closed in production if it is unavailable. Cloudflare Turnstile is now required and verified server-side for project requests, community idea submissions and administrator OTP login. It reduces automated abuse but does not prove a person is trustworthy or replace authorization.
- Community votes use a pseudonymous browser id to discourage accidental duplicate votes, not to prove a human identity. IP rate limiting reduces abuse but does not establish a real person; require authenticated community accounts and/or Turnstile for stronger abuse resistance.
- Configure Razorpay webhook signature verification and reconciliation for production bookkeeping.
- Add your privacy policy, terms, cancellation/refund policy and actual business contact details.
- Review admin allowlist, Supabase RLS and service-role access before inviting users. Review the deployment-specific nonce-based Content Security Policy (CSP), configure production Turnstile keys, monitoring and tested backup restoration before production.

## Acode on Android

Acode is the editor; Next.js requires Node.js. Install Termux, run `pkg install nodejs-lts`, extract the ZIP into a Termux-accessible folder, then `npm install` and `npm run dev`. Open `http://localhost:3000` in a browser. You can edit files in Acode while the Termux server runs.
