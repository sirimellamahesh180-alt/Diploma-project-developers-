import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { buildSecurityHeaders } from '@/lib/security-headers';

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const securityHeaders = buildSecurityHeaders(nonce, process.env.NODE_ENV === 'production', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const csp = securityHeaders['Content-Security-Policy'];
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set('cookie', request.cookies.toString());
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    }});
    await supabase.auth.getUser();
  }
  for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
