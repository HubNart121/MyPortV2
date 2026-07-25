'use client';

import { useMemo } from 'react';

interface ThaiDateInputProps {
  value: string; // ISO date string: YYYY-MM-DD
  onChange: (isoValue: string) => void;
  required?: boolean;
  className?: string;
}

const THAI_MONTHS = [
  'มกราคม (01)',
  'กุมภาพันธ์ (02)',
  'มีนาคม (03)',
  'เมษายน (04)',
  'พฤษภาคม (05)',
  'มิถุนายน (06)',
  'กรกฎาคม (07)',
  'สิงหาคม (08)',
  'กันยายน (09)',
  'ตุลาคม (10)',
  'พฤศจิกายน (11)',
  'ธันวาคม (12)',
];

export function ThaiDateInput({ value, onChange, required, className = 'form-input mono' }: ThaiDateInputProps) {
  // Parse YYYY-MM-DD
  const { day, month, yearBE } = useMemo(() => {
    if (!value) {
      const today = new Date();
      return {
        day: String(today.getDate()).padStart(2, '0'),
        month: String(today.getMonth() + 1).padStart(2, '0'),
        yearBE: today.getFullYear() + 543,
      };
    }
    const parts = value.split('-');
    if (parts.length === 3) {
      const yCE = parseInt(parts[0], 10);
      return {
        day: parts[2],
        month: parts[1],
        yearBE: isNaN(yCE) ? 2569 : yCE + 543,
      };
    }
    return { day: '01', month: '01', yearBE: 2569 };
  }, [value]);

  // Generate Year list in พ.ศ. (e.g. 2570 down to 2550)
  const yearsBE = useMemo(() => {
    const currentBE = new Date().getFullYear() + 543;
    const list: number[] = [];
    for (let y = currentBE + 2; y >= currentBE - 20; y--) {
      list.push(y);
    }
    return list;
  }, []);

  const handleUpdate = (newDay: string, newMonth: string, newYearBE: number) => {
    const yearCE = newYearBE - 543;
    const d = newDay.padStart(2, '0');
    const m = newMonth.padStart(2, '0');
    const isoStr = `${yearCE}-${m}-${d}`;
    onChange(isoStr);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.8fr', gap: '6px', alignItems: 'center' }}>
      {/* Day Select */}
      <select
        className={className}
        value={day}
        onChange={(e) => handleUpdate(e.target.value, month, yearBE)}
        required={required}
        style={{ padding: '6px 8px', fontSize: '13px' }}
      >
        {Array.from({ length: 31 }, (_, i) => {
          const dStr = String(i + 1).padStart(2, '0');
          return (
            <option key={dStr} value={dStr}>
              {dStr}
            </option>
          );
        })}
      </select>

      {/* Month Select */}
      <select
        className={className}
        value={month}
        onChange={(e) => handleUpdate(day, e.target.value, yearBE)}
        required={required}
        style={{ padding: '6px 8px', fontSize: '12px' }}
      >
        {THAI_MONTHS.map((mName, idx) => {
          const mStr = String(idx + 1).padStart(2, '0');
          return (
            <option key={mStr} value={mStr}>
              {mName}
            </option>
          );
        })}
      </select>

      {/* Year BE Select */}
      <select
        className={className}
        value={yearBE}
        onChange={(e) => handleUpdate(day, month, parseInt(e.target.value, 10))}
        required={required}
        style={{ padding: '6px 8px', fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}
      >
        {yearsBE.map((y) => (
          <option key={y} value={y}>
            พ.ศ. {y}
          </option>
        ))}
      </select>
    </div>
  );
}
