'use client';

import { useQuery } from '@tanstack/react-query';
import { getLoginLogs } from '@/lib/logger';

export default function AccessLogsPage() {
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['login_logs'],
    queryFn: () => getLoginLogs(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">ACCESS LOGS</div>
          <div className="page-subtitle">ประวัติการเข้าสู่ระบบและความปลอดภัย (ล่าสุด 100 รายการ)</div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="panel-header">
          <div className="panel-title">LOGIN HISTORY</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary">
                <th className="p-16 stat-label" style={{ borderBottom: '1px solid var(--border)' }}>TIME</th>
                <th className="p-16 stat-label" style={{ borderBottom: '1px solid var(--border)' }}>USER</th>
                <th className="p-16 stat-label" style={{ borderBottom: '1px solid var(--border)' }}>IP ADDRESS</th>
                <th className="p-16 stat-label" style={{ borderBottom: '1px solid var(--border)' }}>DEVICE / OS</th>
                <th className="p-16 stat-label" style={{ borderBottom: '1px solid var(--border)' }}>TYPE</th>
                <th className="p-16 stat-label" style={{ borderBottom: '1px solid var(--border)' }}>STATUS</th>
              </tr>
            </thead>
            <tbody className="mono" style={{ fontSize: '12px' }}>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-32 text-center text-muted">LOADING LOGS...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-32 text-center red">ERROR LOADING LOGS</td>
                </tr>
              ) : logs?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-32 text-center text-muted">NO LOGS FOUND</td>
                </tr>
              ) : (
                logs?.map((log: any) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="hover:bg-page">
                    <td className="p-16 white-space-nowrap">{formatDate(log.created_at)}</td>
                    <td className="p-16">{log.username}</td>
                    <td className="p-16 amber">{log.ip_address}</td>
                    <td className="p-16">{log.device}</td>
                    <td className="p-16 text-muted">{log.device_type}</td>
                    <td className="p-16">
                      <span className={log.status === 'Success' ? 'green' : 'red'}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
