import * as XLSX from 'xlsx';
import type { CashTransactionInput } from './services/cashTransactionService';

export interface CashTransactionImportRow extends CashTransactionInput {
  sourceRow: number;
}

export interface CashTransactionImportWarning {
  sourceRow: number;
  message: string;
}

export interface CashTransactionImportPreview {
  fileName: string;
  rows: CashTransactionImportRow[];
  warnings: CashTransactionImportWarning[];
  sourceRowCount: number;
  counts: { deposits: number; withdrawals: number };
  totals: { deposits: number; withdrawals: number };
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '').replace(/^\uFEFF/, '').replace(/[\s*]/g, '').trim().toLowerCase();
}

function columnIndex(headers: unknown[], choices: string[], required = true): number {
  const normalized = headers.map(normalizeHeader);
  const index = normalized.findIndex((header) => choices.map(normalizeHeader).includes(header));
  if (index < 0 && required) throw new Error(`ไม่พบคอลัมน์ ${choices[0]}`);
  return index;
}

function amountValue(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const text = String(value).trim();
  if (!text || text === '-') return 0;
  const amount = typeof value === 'number' ? value : Number(text.replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) throw new Error('วันที่ไม่ถูกต้อง');
    return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  const thaiDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let year: number;
  let month: number;
  let day: number;
  if (thaiDate) {
    day = Number(thaiDate[1]);
    month = Number(thaiDate[2]);
    year = Number(thaiDate[3]);
  } else if (isoDate) {
    year = Number(isoDate[1]);
    month = Number(isoDate[2]);
    day = Number(isoDate[3]);
  } else {
    throw new Error('วันที่ต้องเป็น วัน/เดือน/พ.ศ. หรือ YYYY-MM-DD');
  }
  if (year > 2400) year -= 543;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new Error('วันที่ไม่มีอยู่จริง');
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function portValue(value: unknown): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'private') return 'Private';
  if (normalized === 'business') return 'Business';
  throw new Error('พอร์ตต้องเป็น Private หรือ Business');
}

export function parseCashTransactionRows(rows: unknown[][], fileName: string): CashTransactionImportPreview {
  if (rows.length < 2) throw new Error('ไฟล์ไม่มีรายการสำหรับนำเข้า');
  const headers = rows[0] ?? [];
  const dateColumn = columnIndex(headers, ['วันที่ทำรายการ (พ.ศ.)', 'วันที่', 'date']);
  const depositColumn = columnIndex(headers, ['ฝากเงิน', 'deposit']);
  const withdrawalColumn = columnIndex(headers, ['ถอนเงิน', 'withdrawal']);
  const portColumn = columnIndex(headers, ['พอร์ต', 'port']);
  const noteColumn = columnIndex(headers, ['หมายเหตุ', 'note'], false);
  const parsedRows: CashTransactionImportRow[] = [];
  const warnings: CashTransactionImportWarning[] = [];

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    if (row.every((value) => value === null || value === undefined || String(value).trim() === '')) continue;
    const sourceRow = index + 1;
    try {
      const deposit = amountValue(row[depositColumn]);
      const withdrawal = amountValue(row[withdrawalColumn]);
      if (!Number.isFinite(deposit) || !Number.isFinite(withdrawal)) throw new Error('จำนวนเงินต้องเป็นตัวเลข');
      if ((deposit > 0) === (withdrawal > 0)) throw new Error('ต้องระบุยอดฝากหรือยอดถอนเพียงช่องเดียว');
      parsedRows.push({
        sourceRow,
        transaction_date: dateToIso(row[dateColumn]),
        type: deposit > 0 ? 'deposit' : 'withdrawal',
        amount: deposit > 0 ? deposit : withdrawal,
        port_type: portValue(row[portColumn]),
        note: noteColumn >= 0 ? String(row[noteColumn] ?? '').trim() || null : null,
      });
    } catch (caught) {
      warnings.push({ sourceRow, message: caught instanceof Error ? caught.message : 'ข้อมูลไม่ถูกต้อง' });
    }
  }

  if (parsedRows.length === 0) throw new Error(warnings[0]?.message ?? 'ไม่พบรายการที่นำเข้าได้');
  return {
    fileName,
    rows: parsedRows,
    warnings,
    sourceRowCount: parsedRows.length + warnings.length,
    counts: {
      deposits: parsedRows.filter((row) => row.type === 'deposit').length,
      withdrawals: parsedRows.filter((row) => row.type === 'withdrawal').length,
    },
    totals: {
      deposits: parsedRows.filter((row) => row.type === 'deposit').reduce((sum, row) => sum + row.amount, 0),
      withdrawals: parsedRows.filter((row) => row.type === 'withdrawal').reduce((sum, row) => sum + row.amount, 0),
    },
  };
}

export async function parseCashTransactionFile(file: File): Promise<CashTransactionImportPreview> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(extension ?? '')) {
    throw new Error('รองรับเฉพาะไฟล์ .xlsx, .xls และ .csv');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 5 MB');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('ไฟล์ไม่มี Sheet');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: true,
    defval: null,
  });
  return parseCashTransactionRows(rows, file.name);
}
