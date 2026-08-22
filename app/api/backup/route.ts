import { exportBackupForEmail } from '@/lib/security/backup-store';
import { requireAuthorizedUser } from '@/lib/security/authorization';
import { secureError, secureJson } from '@/lib/security/api-response';
import { isSecurityAccessError } from '@/lib/security/errors';
import { enforceBackupRateLimit } from '@/lib/security/rate-limit';
import { SecurityConfigurationError } from '@/lib/security/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function rateLimitResponse(request: Request, email: string) {
  const result = await enforceBackupRateLimit(request, email);
  const headers = {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };

  if (result.unavailable) {
    return secureError(
      503,
      'RATE_LIMIT_UNAVAILABLE',
      'Backup protection is temporarily unavailable',
      { ...headers, 'Retry-After': String(result.retryAfter) },
    );
  }
  if (!result.allowed) {
    return secureError(
      429,
      'RATE_LIMIT_EXCEEDED',
      'Too many backup requests',
      { ...headers, 'Retry-After': String(result.retryAfter) },
    );
  }
  return null;
}

function handledSecurityError(error: unknown) {
  if (isSecurityAccessError(error)) {
    return secureError(error.status, error.code, error.message);
  }
  if (error instanceof SecurityConfigurationError) {
    return secureError(503, 'SECURITY_CONFIGURATION_ERROR', 'Security configuration is unavailable');
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthorizedUser(request);
    const limited = await rateLimitResponse(request, user.email);
    if (limited) return limited;

    const backup = await exportBackupForEmail(user.email);
    return secureJson(backup);
  } catch (error) {
    return handledSecurityError(error)
      ?? secureError(500, 'BACKUP_EXPORT_FAILED', 'Unable to export backup');
  }
}
