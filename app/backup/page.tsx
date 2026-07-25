'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BackupRestore } from '@/components/BackupRestore';
import { ToastContainer, useToast } from '@/components/Toast';

export default function BackupPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const handleRestoreComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    toast.show('นำเข้าข้อมูลสำเร็จ!', 'success');
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <div className="page-title">BACKUP / RESTORE</div>
            <div className="page-subtitle">สำรองข้อมูลและนำเข้าข้อมูลพอร์ตการลงทุน</div>
          </div>
        </div>

        <div style={{ maxWidth: '640px' }}>
          <BackupRestore onRestoreComplete={handleRestoreComplete} />
        </div>
      </div>
      <ToastContainer />
    </>
  );
}
