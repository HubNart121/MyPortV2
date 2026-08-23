'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';
import { logLoginAttempt } from '@/lib/logger';
import { loginAction } from '@/lib/actions/auth';
import { isFirebaseConfigured } from '@/lib/firebase';
import { loginWithGoogle } from '@/lib/services/authService';
import { useFirebaseAuth } from '@/components/AuthProvider';
import { isAuthorizedFirebaseUser } from '@/lib/authorized-emails';
import { isOfflineMode } from '@/lib/app-mode';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const { user } = useFirebaseAuth();

  useEffect(() => {
    if (isOfflineMode) {
      router.replace('/');
      return;
    }
    if (typeof window !== 'undefined') {
      const errorCode = new URLSearchParams(window.location.search).get('error');
      if (errorCode === 'unauthorized') {
        setError('บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งานระบบ');
      }
    }

    if (!isFirebaseConfigured && isLoggedIn()) router.push('/');
    if (isFirebaseConfigured && isAuthorizedFirebaseUser(user)) router.push('/');
  }, [router, user]);

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.push('/');
      router.refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Google Sign-In ไม่สำเร็จ');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginAction(username, password);
      await logLoginAttempt(username, result.success ? 'Success' : 'Failed');
      if (result.success) {
        localStorage.setItem('port_track_auth_session', 'true');
        router.push('/');
        router.refresh();
      } else {
        setError(result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  if (isOfflineMode) return null;

  return (
    <div className="flex items-center justify-center min-vh-100 bg-page">
      <div className="panel animate-fade-in" style={{ width: '100%', maxWidth: '420px', margin: '20px' }}>
        <div className="panel-header" style={{ justifyContent: 'center' }}>
          <div className="panel-title" style={{ fontSize: '18px', letterSpacing: '2px' }}>🔒 SECURE ACCESS</div>
        </div>

        <div style={{ padding: '32px' }}>
          <div className="mono text-muted mb-32" style={{ fontSize: '12px', textAlign: 'center' }}>
            TERMINAL // AUTHORIZED_ACCOUNTS_ONLY
          </div>

          {isFirebaseConfigured && (
            <div style={{ marginBottom: '28px' }}>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="btn btn-secondary w-full"
                style={{ height: '48px', fontSize: '14px', fontWeight: 600 }}
              >
                {googleLoading ? 'กำลังตรวจสอบบัญชี Google...' : '🔑 Sign in with authorized Google account'}
              </button>
              <div className="mono text-muted" style={{ marginTop: '12px', fontSize: '10px', textAlign: 'center' }}>
                อนุญาตเฉพาะบัญชีที่กำหนดไว้เท่านั้น
              </div>
            </div>
          )}

          {error && (
            <div className="mono red mb-24" style={{ fontSize: '12px', textAlign: 'center', background: 'rgba(224, 58, 58, 0.1)', padding: '8px' }}>
              ⚠ {error}
            </div>
          )}

          {!isFirebaseConfigured && (
            <form onSubmit={handleSubmit}>
              <div className="form-group mb-24">
                <label className="stat-label mb-8">USERNAME</label>
                <input
                  type="text"
                  className="input-field"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter username"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group mb-32">
                <label className="stat-label mb-8">PASSWORD</label>
                <input
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-full" style={{ height: '48px', fontSize: '14px', fontWeight: 700 }} disabled={loading}>
                {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
