import {
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';
import { isAuthorizedFirebaseUser } from '../authorized-emails';

async function requireAllowedUser(user: User): Promise<User> {
  if (isAuthorizedFirebaseUser(user)) return user;
  if (auth) await firebaseSignOut(auth);
  throw new Error('บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งานระบบ');
}

export async function loginWithGoogle(): Promise<User | null> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase Auth ยังไม่ได้ตั้งค่าใน environment variables');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return requireAllowedUser(result.user);
}

export async function logoutFirebase(): Promise<void> {
  if (auth) {
    await firebaseSignOut(auth);
  }
}
