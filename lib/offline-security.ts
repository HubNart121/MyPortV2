import 'server-only';

import { isOfflineMode } from '@/lib/app-mode';

const DEFAULT_ORIGIN = 'http://localhost:3020';

export class OfflineRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function requireOfflineRequest(request?: Request, requireOrigin = false): void {
  if (!isOfflineMode || process.env.APP_MODE !== 'offline') {
    throw new OfflineRequestError('Offline API is disabled', 404);
  }

  if (!requireOrigin || !request) return;

  const expectedOrigin = process.env.APP_ORIGIN || DEFAULT_ORIGIN;
  if (request.headers.get('origin') !== expectedOrigin) {
    throw new OfflineRequestError('Request origin is not allowed', 403);
  }
}

export function offlineErrorResponse(caught: unknown, fallback: string): Response {
  const status = caught instanceof OfflineRequestError ? caught.status : 500;
  const message = caught instanceof OfflineRequestError ? caught.message : fallback;
  if (!(caught instanceof OfflineRequestError)) {
    console.error('[offline-api]', caught);
  }
  return Response.json({ error: { message } }, { status });
}
