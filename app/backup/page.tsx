'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BackupExport } from '@/components/BackupExport';
import { JsonRestore } from '@/components/JsonRestore';
import { PortfolioClearPanel } from '@/components/PortfolioClearPanel';
import { ToastContainer } from '@/components/Toast';
import { isOfflineMode } from '@/lib/app-mode';

export default function BackupPage() {
  const queryClient = useQueryClient();
  const refreshAppData = () => queryClient.invalidateQueries();

  return (
    <>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <div className="page-title">BACKUP / RESTORE</div>
            <div className="page-subtitle">
              {isOfflineMode
                ? 'สำรองและกู้คืนข้อมูลจาก Local PostgreSQL แบบ Offline'
                : 'สำรองและกู้คืนข้อมูลสำหรับบัญชี Firebase ที่ได้รับอนุญาต'}
            </div>
          </div>
        </div>

        <div className="backup-page-stack">
          <BackupExport />
          <JsonRestore onRestoreComplete={refreshAppData} />
          <PortfolioClearPanel onClearComplete={refreshAppData} />
        </div>
      </div>
      <ToastContainer />
    </>
  );
}
