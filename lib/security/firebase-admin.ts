import 'server-only';

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { SecurityConfigurationError } from './config';

function firebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new SecurityConfigurationError('FIREBASE_PROJECT_ID is required');
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson) as {
        projectId: string;
        clientEmail: string;
        privateKey: string;
      })
    : applicationDefault();

  return initializeApp({ credential, projectId });
}

export function adminAuth() {
  return getAuth(firebaseAdminApp());
}

export function adminFirestore() {
  return getFirestore(firebaseAdminApp());
}

export async function firebaseUserForEmail(email: string): Promise<UserRecord> {
  const auth = adminAuth();

  try {
    const existing = await auth.getUserByEmail(email);
    if (!existing.emailVerified) {
      return auth.updateUser(existing.uid, { emailVerified: true });
    }
    return existing;
  } catch (error: unknown) {
    if (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && error.code === 'auth/user-not-found'
    ) {
      return auth.createUser({ email, emailVerified: true });
    }
    throw error;
  }
}

