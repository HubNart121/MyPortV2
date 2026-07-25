'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';
import { logLoginAttempt } from '@/lib/logger';
import { loginAction } from '@/lib/actions/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginAction(username, password);
      
      // Log the attempt
      await logLoginAttempt(username, result.success ? 'Success' : 'Failed');

      if (result.success) {
        // Update local storage for legacy client components IF needed
        if (typeof window !== 'undefined') {
          localStorage.setItem('port_track_auth_session', 'true');
        }
        
        router.push('/');
        router.refresh(); 
      } else {
        setError(result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-vh-100 bg-page">
      <div className="panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', margin: '20px' }}>
        <div className="panel-header" style={{ justifyContent: 'center' }}>
          <div className="panel-title" style={{ fontSize: '18px', letterSpacing: '2px' }}>🔒 SECURE ACCESS</div>
        </div>
        
        <div style={{ padding: '32px' }}>
          <div className="mono text-muted mb-32" style={{ fontSize: '12px', textAlign: 'center' }}>
            TERMINAL // AUTHENTICATION_REQUIRED
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-24">
              <label className="stat-label mb-8">USERNAME</label>
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="mono red mb-24" style={{ fontSize: '12px', textAlign: 'center', background: 'rgba(224, 58, 58, 0.1)', padding: '8px' }}>
                ⚠ {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary w-full" 
              style={{ height: '48px', fontSize: '14px', fontWeight: 700 }}
              disabled={loading}
            >
              {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
            </button>
          </form>

          <div className="mono text-muted mt-32" style={{ fontSize: '10px', textAlign: 'center', opacity: 0.5 }}>
            PORT_TRACK — ASSET MANAGEMENT SYSTEM V1.0
          </div>
        </div>
      </div>
    </div>
  );
}
