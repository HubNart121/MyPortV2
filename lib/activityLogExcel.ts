import { utils, write } from 'xlsx';
import type { ActivityLog } from './types';
import { ACTIVITY_ACTION_LABELS, ACTIVITY_CATEGORY_LABELS } from './services/activityLogService';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function formatThaiDateTime(value: string): string {
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

export function downloadActivityLogsExcel(logs: ActivityLog[]): void {
  const rows = logs.map((item) => [
    formatThaiDateTime(item.created_at),
    item.actor_email || '-',
    ACTIVITY_ACTION_LABELS[item.action] ?? item.action,
    ACTIVITY_CATEGORY_LABELS[item.category] ?? item.category,
    item.target_label || '-',
    item.summary || '-',
  ]);

  const worksheet = utils.aoa_to_sheet([
    ['เวลา', 'ผู้ใช้', 'Action', 'Category', 'Target', 'Summary'],
    ...rows,
  ]);
  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 14 },
    { wch: 18 },
    { wch: 28 },
    { wch: 60 },
  ];
  worksheet['!autofilter'] = { ref: `A1:F${Math.max(1, rows.length + 1)}` };

  const workbook = utils.book_new();
  workbook.Props = {
    Title: 'My Port v2 Activity Log',
    Subject: 'Activity Log',
    Author: 'PORT_TRACK',
    CreatedDate: new Date(),
  };
  utils.book_append_sheet(workbook, worksheet, 'Activity Log');

  const output = write(workbook, { type: 'array', bookType: 'xlsx', compression: true, cellStyles: true });
  const blob = new Blob([output], { type: MIME_XLSX });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `my-port-activity-log-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
