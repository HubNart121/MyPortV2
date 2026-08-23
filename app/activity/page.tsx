'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_LOG_RETENTION_DAYS,
  fetchActivityLogs,
} from '@/lib/services/activityLogService';
import { downloadActivityLogsExcel } from '@/lib/activityLogExcel';
import type { ActivityAction, ActivityCategory } from '@/lib/types';

const ACTIONS: Array<'all' | ActivityAction> = ['all', 'create', 'update', 'delete', 'import', 'clear', 'restore'];
const CATEGORIES: Array<'all' | ActivityCategory> = [
  'all',
  'stock',
  'buy_round',
  'sell',
  'dividend',
  'cash',
  'file',
  'information',
  'system',
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function minIsoDate(): string {
  return new Date(Date.now() - ACTIVITY_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ActivityLogPage() {
  const [actionFilter, setActionFilter] = useState<'all' | ActivityAction>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ActivityCategory>('all');
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState(minIsoDate);
  const [dateTo, setDateTo] = useState(todayIsoDate);

  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => fetchActivityLogs(200),
    refetchInterval: 60_000,
  });

  const visibleLogs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000`).getTime() : Number.NEGATIVE_INFINITY;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;

    return logs.filter((item) => {
      const createdAt = new Date(item.created_at).getTime();
      if (actionFilter !== 'all' && item.action !== actionFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (Number.isFinite(createdAt) && (createdAt < from || createdAt > to)) return false;
      if (!normalizedKeyword) return true;

      return [
        item.actor_email,
        item.action,
        item.category,
        item.target_label,
        item.summary,
      ].some((value) => String(value ?? '').toLowerCase().includes(normalizedKeyword));
    });
  }, [actionFilter, categoryFilter, dateFrom, dateTo, keyword, logs]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">ACTIVITY LOG</div>
          <div className="page-subtitle">
            บันทึกการเปลี่ยนแปลงข้อมูลแบบสรุปปลอดภัย · เก็บย้อนหลัง {ACTIVITY_LOG_RETENTION_DAYS} วัน
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => void refetch()} disabled={isLoading}>
            ↻ Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => downloadActivityLogsExcel(visibleLogs)}
            disabled={visibleLogs.length === 0}
          >
            ⇩ Download Excel
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '20px' }}>
        <div className="panel-header">
          <div className="panel-title">FILTERS</div>
        </div>
        <div className="panel-body" style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Action</label>
              <select className="form-input" value={actionFilter} onChange={(event) => setActionFilter(event.target.value as 'all' | ActivityAction)}>
                {ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action === 'all' ? 'ทั้งหมด' : ACTIVITY_ACTION_LABELS[action]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as 'all' | ActivityCategory)}>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'ทุกหมวด' : ACTIVITY_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">จากวันที่</label>
              <input className="form-input" type="date" min={minIsoDate()} max={todayIsoDate()} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">ถึงวันที่</label>
              <input className="form-input" type="date" min={minIsoDate()} max={todayIsoDate()} value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              className="form-input"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="ค้นหา symbol, target, summary หรือผู้ใช้"
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">RECENT ACTIVITY</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '3px' }}>
              แสดง {visibleLogs.length} จาก {logs.length} รายการล่าสุด
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state"><div className="empty-state-title">กำลังโหลด Activity Log...</div></div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-title" style={{ color: 'var(--red)' }}>โหลด Activity Log ไม่สำเร็จ</div>
            <div className="empty-state-desc">{(error as Error).message}</div>
          </div>
        ) : visibleLogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">▦</div>
            <div className="empty-state-title">ยังไม่มี Activity Log ตามเงื่อนไขนี้</div>
            <div className="empty-state-desc">ระบบจะเริ่มบันทึกหลังจากมีการเพิ่ม แก้ไข ลบ import clear หรือ restore ข้อมูล</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '980px' }}>
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>ผู้ใช้</th>
                  <th>Action</th>
                  <th>Category</th>
                  <th>Target</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {visibleLogs.map((item) => (
                  <tr key={item.id}>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(item.created_at)}</td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.actor_email || '-'}</td>
                    <td><span className="filter-chip active mono">{ACTIVITY_ACTION_LABELS[item.action] ?? item.action}</span></td>
                    <td>{ACTIVITY_CATEGORY_LABELS[item.category] ?? item.category}</td>
                    <td className="mono" style={{ color: 'var(--amber)' }}>{item.target_label || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.summary || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
