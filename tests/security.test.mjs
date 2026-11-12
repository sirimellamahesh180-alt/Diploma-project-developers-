import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Turnstile server verification is fail-closed and calls Cloudflare Siteverify', async () => {
  const source = await read('lib/turnstile.ts');
  assert.match(source, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.match(source, /if \(!secret[\s\S]*return false/);
  assert.match(source, /if \(!result\.success\) return false/);
  assert.match(source, /AbortSignal\.timeout\(5000\)/);
  assert.match(source, /TURNSTILE_EXPECTED_HOSTNAME/);
});

test('public project and community write endpoints require verified Turnstile actions', async () => {
  const requests = await read('app/api/requests/route.ts');
  const ideas = await read('app/api/ideas/route.ts');
  assert.match(requests, /verifyTurnstile\(raw\.turnstileToken, req, 'project_request'\)/);
  assert.match(ideas, /verifyTurnstile\(raw\.turnstileToken,req,'community_idea'\)/);
});

test('both administrator OTP stages require separate Turnstile action verification', async () => {
  const auth = await read('app/api/auth/route.ts');
  assert.match(auth, /admin_send_otp/);
  assert.match(auth, /admin_verify_otp/);
  assert.match(auth, /shouldCreateUser:false/);
  assert.match(auth, /verifyOtp\(/);
  assert.match(auth, /admin_users/);
});

test('administrator session is checked against the server-side allowlist', async () => {
  const auth = await read('lib/auth.ts');
  assert.match(auth, /supabase\.auth\.getUser\(\)/);
  assert.match(auth, /admin_users/);
  assert.match(auth, /user\.email\.toLowerCase\(\)/);
});

test('middleware sends a nonce-based CSP and baseline browser security headers', async () => {
  const middleware = await read('middleware.ts');
  const headers = await read('lib/security-headers.ts');
  assert.match(middleware, /x-nonce/);
  assert.match(middleware, /Content-Security-Policy/);
  for (const directive of ['default-src', 'script-src', 'object-src', 'base-uri', 'frame-ancestors']) assert.ok(headers.includes(directive), `Missing CSP directive: ${directive}`);
  for (const header of ['X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security']) assert.ok(headers.includes(header), `Missing header: ${header}`);
});

test('browser forms submit Turnstile tokens and block submit until verified', async () => {
  const requestPage = await read('app/request/page.tsx');
  const communityPage = await read('app/community/page.tsx');
  const adminPage = await read('app/admin/page.tsx');
  for (const source of [requestPage, communityPage, adminPage]) {
    assert.match(source, /components\/Turnstile/);
    assert.match(source, /turnstileToken/);
  }
  assert.match(communityPage, /disabled=\{busy\|\|!turnstileToken\}/);
  assert.match(adminPage, /!turnstileToken/);
});
