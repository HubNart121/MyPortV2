import { NextResponse } from 'next/server';

const SENSITIVE_RESPONSE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

export function secureJson(
  body: unknown,
  init: {
    status?: number;
    headers?: HeadersInit;
  } = {},
): NextResponse {
  const headers = new Headers(SENSITIVE_RESPONSE_HEADERS);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  return NextResponse.json(body, { status: init.status, headers });
}

export function secureError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): NextResponse {
  return secureJson(
    { ok: false, error: { code, message } },
    { status, headers },
  );
}

