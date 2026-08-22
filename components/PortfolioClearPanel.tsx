'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { clearPortfolio } from '@/lib/services/portfolioService';
import { isOfflineMode } from '@/lib/app-mode';

const CLEAR_PORTFOLIO_PASSWORD = 'clearnart';

export function PortfolioClearPanel({ onClearComplete }: { onClearComplete?: () => void | Promise<void> }) {
  const [clearing, setClearing] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [clearError, setClearError] = useState<string | null>(null);
  const toast = useToast();

  const handleClearPortfolio = async () => {
    setClearError(null);
    if (clearPassword !== CLEAR_PORTFOLIO_PASSWORD) {
      setClearError('รหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง');
      return;
    }
    if (!confirm(
      'ยืนยันลบข้อมูลซื้อขายหุ้นทั้งหมด?\n\n'
      + `ระบบจะลบหุ้น รอบซื้อ ประวัติขาย และประวัติปันผลทั้งหมดจาก ${isOfflineMode ? 'Local PostgreSQL' : 'บัญชี Firebase ที่กำลังใช้งาน'}\n`
      + 'ไฟล์และคลังความรู้จะไม่ถูกลบ\n\n'
      + 'การดำเนินการนี้ไม่สามารถย้อนกลับได้',
    )) return;

    setClearing(true);
    try {
      const deletedCount = await clearPortfolio();
      setClearPassword('');
      await onClearComplete?.();
      toast.show(`ลบข้อมูลซื้อขายหุ้นทั้งหมดแล้ว (${deletedCount} หุ้น)`, 'success');
    } catch (caught: unknown) {
      setClearError(caught instanceof Error ? caught.message : 'ลบข้อมูลไม่สำเร็จ');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="panel" style={{ borderColor: 'rgba(224,58,58,0.45)' }}>
      <div className="panel-header" style={{ borderBottomColor: 'rgba(224,58,58,0.3)' }}>
        <div className="panel-title" style={{ color: 'var(--red)' }}>⚠ Clear ข้อมูลซื้อขายหุ้นทั้งหมด</div>
      </div>
      <div className="panel-body">
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          ลบหุ้น รอบซื้อ ประวัติขาย และประวัติปันผลทั้งหมดจาก {isOfflineMode ? 'Local PostgreSQL' : 'บัญชี Firebase ที่กำลังใช้งาน'}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          ไฟล์และคลังความรู้จะไม่ถูกลบ · ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้หากไม่มีไฟล์ Backup
        </p>
        <label htmlFor="clear-portfolio-password" style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Password ยืนยัน
        </label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            id="clear-portfolio-password"
            type="password"
            value={clearPassword}
            onChange={(event) => { setClearPassword(event.target.value); setClearError(null); }}
            placeholder="ใส่ Password เพื่อยืนยัน"
            autoComplete="off"
            disabled={clearing}
            className="form-input"
            style={{ minWidth: '260px', flex: '1 1 260px' }}
          />
          <button className="btn btn-danger" onClick={handleClearPortfolio} disabled={clearing || clearPassword.length === 0}>
            {clearing ? 'กำลังลบข้อมูล...' : '✕ Clear ข้อมูลทั้งหมด'}
          </button>
        </div>
        {clearError && <div className="operation-message operation-error">⚠ {clearError}</div>}
      </div>
    </div>
  );
}
