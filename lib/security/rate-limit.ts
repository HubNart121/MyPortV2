import 'server-only';

import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { adminFirestore } from './firebase-admin';

export interface BackupRateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  retryAfter: number;
  unavailable: boolean;
}

let limiter: Ratelimit | null = null;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function configuredLimiter(): Ratelimit | null {
  if (limiter) return limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const requests = positiveInteger(process.env.BACKUP_RATE_LIMIT_REQUESTS, 10);
  const windowSeconds = positiveInteger(process.env.BACKUP_RATE_LIMIT_WINDOW_SECONDS, 60);

  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    analytics: true,
    prefix: 'myport:backup',
    timeout: 1500,
  });
  return limiter;
}

function trustedClientIp(request: Request): string | null {
  const trustedProxyHops = positiveInteger(process.env.TRUSTED_PROXY_HOPS, 0);
  if (trustedProxyHops === 0) return null;

  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return null;

  const addresses = forwarded
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const index = addresses.length - trustedProxyHops - 1;
  if (index < 0) return null;

  const candidate = addresses[index].replace(/^\[|\]$/g, '');
  return isIP(candidate) ? candidate : null;
}

function hashIdentifier(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function requestIdentity(request: Request, authorizedEmail: string): string {
  const ip = trustedClientIp(request);
  return ip ? `${authorizedEmail}|${ip}` : authorizedEmail;
}

async function firestoreFallbackLimit(
  request: Request,
  authorizedEmail: string,
): Promise<BackupRateLimitResult> {
  const requests = positiveInteger(process.env.BACKUP_RATE_LIMIT_REQUESTS, 10);
  const windowSeconds = positiveInteger(process.env.BACKUP_RATE_LIMIT_WINDOW_SECONDS, 60);
  const now = Date.now();
  const windowMs = windowSeconds * 1_000;
  const key = hashIdentifier(requestIdentity(request, authorizedEmail));
  const reference = adminFirestore().collection('_system_rate_limits').doc(`backup-${key}`);

  try {
    return await adminFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const data = snapshot.data();
      const storedReset = typeof data?.reset === 'number' ? data.reset : 0;
      const storedCount = typeof data?.count === 'number' ? data.count : 0;
      const reset = storedReset > now ? storedReset : now + windowMs;
      const count = storedReset > now ? storedCount : 0;

      if (count >= requests) {
        return {
          allowed: false,
          remaining: 0,
          reset,
          retryAfter: Math.max(1, Math.ceil((reset - now) / 1_000)),
          unavailable: false,
        };
      }

      transaction.set(reference, {
        count: count + 1,
        reset,
        updated_at: now,
      });

      return {
        allowed: true,
        remaining: Math.max(0, requests - count - 1),
        reset,
        retryAfter: 0,
        unavailable: false,
      };
    });
  } catch {
    return {
      allowed: false,
      remaining: 0,
      reset: now + windowMs,
      retryAfter: windowSeconds,
      unavailable: true,
    };
  }
}

export async function enforceBackupRateLimit(
  request: Request,
  authorizedEmail: string,
): Promise<BackupRateLimitResult> {
  const activeLimiter = configuredLimiter();
  if (!activeLimiter) {
    return firestoreFallbackLimit(request, authorizedEmail);
  }

  const identity = requestIdentity(request, authorizedEmail);

  try {
    const result = await activeLimiter.limit(hashIdentifier(identity));
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

    if (result.reason === 'timeout') {
      return {
        allowed: false,
        remaining: 0,
        reset: result.reset,
        retryAfter,
        unavailable: true,
      };
    }

    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter,
      unavailable: false,
    };
  } catch {
    return {
      allowed: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      retryAfter: 60,
      unavailable: true,
    };
  }
}
