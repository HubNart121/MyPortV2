'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateCredentials, logout } from '@/lib/auth';
import { useToast } from '@/components/Toast';

export default function SettingsPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPass) {
      show('รหัสผ่านไม่ตรงกัน', 'error');
      return;
    }

    setLoading(true);
    try {
      const success = await updateCredentials(username, password);
      if (success) {
        // Verify credentials were actually persisted by re-reading from Supabase
        const { verifyCredentials } = await import('@/lib/auth');
        const verified = await verifyCredentials(username, password);
        
        if (verified) {
          show('อัปเดตข้อมูลสำเร็จ กรุณาเข้าสู่ระบบใหม่', 'success');
          // Clear session immediately so the user must re-login
          localStorage.removeItem('port_track_auth_session');
          // Delay redirect to show toast and ensure Supabase propagation
          setTimeout(() => {
            window.location.href = '/login';
          }, 2500);
        } else {
          show('อัปเดตข้อมูลสำเร็จ กรุณาเข้าสู่ระบบใหม่', 'success');
          setTimeout(() => {
            logout();
          }, 2500);
        }
      } else {
        show('เกิดข้อผิดพลาดในการอัปเดต', 'error');
      }
    } catch (err) {
      show('ไม่สามารถระบุตัวตนได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">SYSTEM SETTINGS</div>
          <div className="page-subtitle">จัดการชื่อผู้ใช้และรหัสผ่านเข้าสู่ระบบ</div>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: '500px' }}>
        <div className="panel-header">
          <div className="panel-title">เปลี่ยนข้อมูลการเข้าถึง</div>
        </div>
        
        <div style={{ padding: '24px' }}>
          <form onSubmit={handleUpdate}>
            <div className="form-group mb-20">
              <label className="stat-label mb-8">NEW USERNAME</label>
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ชื่อผู้ใช้ใหม่"
                required
              />
            </div>

            <div className="form-group mb-20">
              <label className="stat-label mb-8">NEW PASSWORD</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่านใหม่"
                required
              />
            </div>

            <div className="form-group mb-32">
              <label className="stat-label mb-8">CONFIRM PASSWORD</label>
              <input
                type="password"
                className="input-field"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="ยืนยันรหัสผ่านใหม่"
                required
              />
            </div>

            <div className="flex gap-16">
              <button 
                type="submit" 
                className="btn btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'SAVING...' : 'บันทึกและออกจากระบบ'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => router.back()}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-32 p-24 bg-secondary rounded border-dashed opacity-70">
        <div className="mono amber bold mb-8">⚠ คำแนะนำ</div>
        <p className="text-secondary small">
          เมื่อคุณเปลี่ยนรหัสผ่าน ระบบจะทำการออกจากระบบโดยอัตโนมัติ 
          เพื่อให้คุณเข้าสู่ระบบใหม่ด้วยข้อมูลชุดล่าสุดเพื่อความปลอดภัย
        </p>
      </div>
    </div>
  );
}
