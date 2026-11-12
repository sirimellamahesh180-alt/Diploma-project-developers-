export function buildSecurityHeaders(nonce: string, isProduction: boolean, supabaseUrl?: string) {
  const supabaseOrigin = (() => { try { return supabaseUrl ? new URL(supabaseUrl).origin : ''; } catch { return ''; } })();
  const connect = ["'self'", supabaseOrigin, supabaseOrigin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')].filter(Boolean).join(' ');
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isProduction ? '' : "'unsafe-eval'"} https://challenges.cloudflare.com https://checkout.razorpay.com https://*.razorpay.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect} https://challenges.cloudflare.com https://checkout.razorpay.com https://*.razorpay.com`,
    'frame-src https://challenges.cloudflare.com https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ];
  return {
    'Content-Security-Policy': directives.join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...(isProduction ? { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload' } : {}),
  };
}
