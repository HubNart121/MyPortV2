interface EmailUser {
  email: string | null;
  emailVerified: boolean;
  providerData: ReadonlyArray<{ providerId: string }>;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function allowedEmails(): ReadonlySet<string> {
  return new Set(
    (process.env.NEXT_PUBLIC_ALLOWED_GOOGLE_EMAIL ?? '')
      .split(',')
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

export function isAuthorizedEmail(email: string | null | undefined): boolean {
  return Boolean(email && allowedEmails().has(normalizeEmail(email)));
}

export function isAuthorizedFirebaseUser(user: EmailUser | null): boolean {
  return Boolean(
    user?.emailVerified
    && isAuthorizedEmail(user.email)
    && user.providerData.some((provider) => provider.providerId === 'google.com'),
  );
}
