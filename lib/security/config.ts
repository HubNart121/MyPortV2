export class SecurityConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityConfigurationError';
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getAllowedEmails(): ReadonlySet<string> {
  const raw = process.env.ALLOWED_GOOGLE_EMAIL;
  if (!raw) {
    throw new SecurityConfigurationError('ALLOWED_GOOGLE_EMAIL is required');
  }

  const emails = raw
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);

  if (emails.length === 0) {
    throw new SecurityConfigurationError('ALLOWED_GOOGLE_EMAIL must contain at least one email');
  }

  return new Set(emails);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowedEmails().has(normalizeEmail(email));
}
