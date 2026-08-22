import { utils, write } from 'xlsx';
import type { CashTransaction } from './types';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const CASH_TRANSACTION_EXPORT_HEADERS = [
  'วันที่ทำรายการ (พ.ศ.) *',
  'ฝากเงิน',
  'ถอนเงิน',
  'พอร์ต',
] as const;

function thaiDateText(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year > 2400 ? year : year + 543}`;
}

export function cashTransactionExportRows(transactions: CashTransaction[]): (string | number)[][] {
  return [
    [...CASH_TRANSACTION_EXPORT_HEADERS],
    ...transactions.map((item) => [
      thaiDateText(item.transaction_date),
      item.type === 'deposit' ? Number(item.amount) : '-',
      item.type === 'withdrawal' ? Number(item.amount) : '-',
      item.port_type,
    ]),
  ];
}

export function downloadCashTransactionsExcel(transactions: CashTransaction[]): void {
  const worksheet = utils.aoa_to_sheet(cashTransactionExportRows(transactions));
  worksheet['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
  worksheet['!autofilter'] = { ref: `A1:D${Math.max(1, transactions.length + 1)}` };
  transactions.forEach((item, index) => {
    const rowNumber = index + 2;
    const amountCell = worksheet[`${item.type === 'deposit' ? 'B' : 'C'}${rowNumber}`];
    if (amountCell) amountCell.z = '#,##0.00';
  });

  const workbook = utils.book_new();
  workbook.Props = {
    Title: 'PORT_TRACK Cash Transactions',
    Subject: 'รายการฝากเงินและถอนเงิน',
    Author: 'PORT_TRACK',
    CreatedDate: new Date(),
  };
  utils.book_append_sheet(workbook, worksheet, 'Cash Transactions');
  const output = write(workbook, { type: 'array', bookType: 'xlsx', compression: true, cellStyles: true });
  const blob = new Blob([output], { type: MIME_XLSX });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `PORT_TRACK_Cash_Transactions_${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
