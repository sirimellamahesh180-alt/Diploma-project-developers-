# Deploy this project without npm or a terminal

This project is a **Next.js 15 server application**. It includes server API routes, middleware,
Supabase authentication/database access, Razorpay payment endpoints, and email integration.
It cannot be deployed as a plain static site (for example, by uploading files to GitHub Pages).

The simplest no-terminal route is:

1. Upload the project to GitHub using the GitHub website.
2. Import that GitHub repository into Vercel using the Vercel website.
3. Add provider credentials in Vercel's Environment Variables dashboard.
4. Deploy. Vercel installs the dependencies and runs the Next.js build on its own servers.
   You do **not** need npm or a terminal on your phone/computer.

## A. Upload to GitHub in your browser

1. Sign in at https://github.com and create a **private** repository, for example
   `diploma-project-developers`. Do not add a README, license, or `.gitignore` during creation.
2. Open the empty repository and choose **Add file → Upload files**.
3. Extract this ZIP on your device using its file manager/archive app.
4. Open the extracted `diploma-project-developers` folder. Upload its *contents* (including
   `app`, `components`, `database`, `lib`, `tests`, `types`, and root config files), not an
   extra enclosing folder.
5. Commit the upload to the `main` branch.

If GitHub's mobile website does not let you select a whole folder, use a desktop browser or
GitHub's browser interface on a computer. Do not upload `.env` files or provider secrets.

## B. Create the Vercel project

1. Sign in at https://vercel.com using the same GitHub account.
2. Select **Add New → Project**, then import `diploma-project-developers`.
3. Confirm these settings:
   - Framework Preset: **Next.js**
   - Root Directory: `./` (the repository root; it should contain `package.json`)
   - Build Command: `next build` (default is fine)
   - Output Directory: leave the default
   - Install Command: leave the default
4. Before deploying, open **Environment Variables** and add the variables listed below.
5. Deploy. Vercel performs dependency installation and compilation remotely. No local npm
   installation or terminal command is needed.

## C. Configure the required services

Create/configure these services in their own dashboards. Use test/sandbox payment credentials
until the whole flow has been tested.

### Supabase
1. Create a project at https://supabase.com/dashboard.
2. Open SQL Editor and run the complete contents of `database/schema.sql`.
3. In Authentication settings, enable email OTP/passwordless sign-in and configure the email
   template to send the OTP token (`{{ .Token }}`).
4. Create/invite the administrator account in Authentication → Users.
5. Add that exact verified administrator email to `public.admin_users` using the SQL editor:

   ```sql
   insert into public.admin_users(email)
   values ('YOUR_ADMIN_EMAIL')
   on conflict do nothing;
   ```

6. Copy the Project URL, anon/publishable key, and service-role key from Project Settings → API.
   The service-role key is secret and must only be entered as a server environment variable.

### Upstash Redis
1. Create a Redis database at https://console.upstash.com/.
2. Copy its REST URL and REST token. Both are required for production write-route rate limiting.
   The application intentionally fails closed for protected writes if the production limiter is
   not configured or unavailable.

### Cloudflare Turnstile
1. Create a Turnstile widget at https://dash.cloudflare.com/.
2. Add your eventual Vercel hostname (for example `your-project.vercel.app`) to allowed hostnames.
3. Copy the site key and secret key. The secret key is server-only.
4. Set the expected hostname to the hostname only, without `https://` or a path.

### Resend
1. Create an account at https://resend.com and verify a domain you control.
2. Create an API key and use a sender address on that verified domain.
3. Do not expect production email to work until domain verification and sender setup are complete.

### Razorpay
1. Use https://dashboard.razorpay.com/ and start in **Test Mode**.
2. Copy the test Key ID and Key Secret. Configure a webhook with URL
   `https://YOUR_VERCEL_HOST/api/payments/webhook`, subscribe to `payment.captured` and
   `order.paid`, and copy the webhook secret.
3. Do not switch to Live Mode until order creation, signature verification, webhook handling,
   failed payments, duplicate callbacks, refunds, and reconciliation have been tested.

## D. Add these Vercel Environment Variables

In Vercel → Project → Settings → Environment Variables, add each variable for the **Production**
environment (and Preview too if you will test preview deployments). Use real values from the
provider dashboards; never paste the example placeholders.

| Name | Value/source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (secret) |
| `RESEND_API_KEY` | Resend API key (secret) |
| `EMAIL_FROM` | Verified sender, e.g. `Diploma Project Developers <notifications@yourdomain.com>` |
| `NOTIFICATION_EMAIL` | Inbox that should receive request notifications |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (test initially) |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret (secret) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret (secret) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same Razorpay Key ID as above |
| `NEXT_PUBLIC_SITE_URL` | Full deployed URL, e.g. `https://your-project.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token (secret) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret (secret) |
| `TURNSTILE_EXPECTED_HOSTNAME` | Hostname only, e.g. `your-project.vercel.app` |

`NEXT_PUBLIC_` means the value is exposed to the browser. Never put a secret in a variable with
that prefix. Never commit secrets to GitHub, source files, screenshots, or public issue trackers.

## E. Finish domain and authentication settings

After the first Vercel deployment:

1. Copy the actual Vercel deployment URL.
2. Update `NEXT_PUBLIC_SITE_URL` in Vercel to that exact URL, then redeploy.
3. In Supabase → Authentication → URL Configuration, set Site URL to the deployed URL and add
   the deployed URL to Redirect URLs.
4. Confirm the hostname is allowed in Turnstile and matches `TURNSTILE_EXPECTED_HOSTNAME`.
5. In Razorpay, confirm the webhook URL uses the final deployed domain.

Changing environment variables requires a new deployment/redeployment in Vercel.

## F. Verify before public launch

- Open the home page, request form, community, announcements, admin, and payment pages.
- Open `/api/health` and confirm the configuration status is ready; do not share its output if it
  contains operational details.
- Submit a test request and confirm the database record and both email notifications.
- Test admin OTP login using only the allowlisted admin account.
- Test community idea submission and voting.
- Test a quoted/accepted request through Razorpay Test Mode, including the webhook.
- Confirm unauthenticated users cannot access admin APIs.
- Check Vercel deployment logs for runtime/build errors.
- Review Supabase RLS, backups, privacy/terms/refund policies, and production monitoring.

## What is and is not done in this ZIP

- The source project is preserved; this guide adds a browser-only deployment path.
- The six existing source-level security regression tests passed when checked in the provided
  environment.
- A full Next.js production build, TypeScript check, dependency vulnerability audit, and live
  provider integration test were **not** run here. Passing the six tests does not prove the
  application is production-safe.
- Provider accounts, database setup, credentials, DNS/domain verification, and payment activation
  must be completed by you in their dashboards. They cannot be safely fabricated or completed
  without access to your accounts.

**Bottom line:** You do not need npm or a terminal locally. Vercel still runs the package install
and build remotely as part of deployment; there is no way to deploy this server-side Next.js
application without a build/runtime platform.
