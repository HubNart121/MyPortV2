'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebaseAuth } from './AuthProvider';
import { logoutFirebase } from '@/lib/services/authService';
import { isAuthorizedFirebaseUser } from '@/lib/authorized-emails';

const PUBLIC_PATHS = ['/login'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isFirebaseActive } = useFirebaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isAuthorized = isAuthorizedFirebaseUser(user);

  useEffect(() => {
    if (!isFirebaseActive || loading) return;

    if (user && !isAuthorized) {
      void logoutFirebase().finally(() => {
        router.replace('/login?error=unauthorized');
      });
      return;
    }

    if (!user && !isPublic) {
      router.replace('/login');
      return;
    }

    if (isAuthorized && pathname === '/login') {
      router.replace('/');
    }
  }, [user, loading, isFirebaseActive, isAuthorized, isPublic, pathname, router]);

  if (isFirebaseActive && loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-page)' }}>
        <div className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
          AUTHENTICATING...
        </div>
      </div>
    );
  }

  if (
    isFirebaseActive
    && ((!user && !isPublic) || (Boolean(user) && !isAuthorized))
  ) {
    return null;
  }

  return <>{children}</>;
}
