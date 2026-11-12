'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = { onVerify: (token: string) => void; action: string; resetKey?: string | number };

export function Turnstile({ onVerify, action, resetKey = 0 }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onVerify);
  const widgetId = useRef<string | undefined>(undefined);
  callback.current = onVerify;

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !container.current) return;
    let cancelled = false;
    let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    const render = () => {
      if (cancelled || !container.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action,
        callback: (token: string) => callback.current(token),
        'expired-callback': () => callback.current(''),
        'error-callback': () => callback.current(''),
        theme: 'dark',
      });
    };
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = 'true';
      document.head.appendChild(script);
    }
    script.addEventListener('load', render);
    if (window.turnstile) render();
    return () => {
      cancelled = true;
      script?.removeEventListener('load', render);
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [action, resetKey]);

  return <div ref={container} className="my-3 min-h-[65px]" aria-label="Human verification" />;
}
