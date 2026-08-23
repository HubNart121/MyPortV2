import 'server-only';

import { isAllowedEmail, normalizeEmail, SecurityConfigurationError } from './config';
import { adminAuth } from './firebase-admin';
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
} from './errors';

export interface AuthorizedUser {
  email: string;
  name: string | null;
}

async function firebaseBearerUser(request: Request | undefined): Promise<AuthorizedUser | null> {
  const authorization = request?.headers.get('authorization')?.trim();
  if (!authorization?.startsWith('Bearer ')) return null;

  const idToken = authorization.slice('Bearer '.length).trim();
  if (!idToken) throw new AuthenticationRequiredError();

  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    if (
      !decoded.email
      || decoded.email_verified !== true
      || decoded.firebase?.sign_in_provider !== 'google.com'
    ) {
      throw new AuthorizationDeniedError();
    }
    if (!isAllowedEmail(decoded.email)) throw new AuthorizationDeniedError();

    return {
      email: normalizeEmail(decoded.email),
      name: typeof decoded.name === 'string' ? decoded.name : null,
    };
  } catch (error) {
    if (
      error instanceof AuthorizationDeniedError
      || error instanceof SecurityConfigurationError
    ) {
      throw error;
    }
    throw new AuthenticationRequiredError();
  }
}

export async function requireAuthorizedUser(request: Request): Promise<AuthorizedUser> {
  const firebaseUser = await firebaseBearerUser(request);
  if (firebaseUser) return firebaseUser;
  throw new AuthenticationRequiredError();
}
