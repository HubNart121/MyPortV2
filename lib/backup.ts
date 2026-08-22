import type { BackupCategoryCounts, BackupData, BackupManifest } from './types';

export const BACKUP_SCHEMA_VERSION = 4;

type BackupCollections = Pick<
  BackupData,
  'stocks' | 'files' | 'informations' | 'cash_transactions'
>;

export function getBackupCategoryCounts(backup: BackupCollections): BackupCategoryCounts {
  return {
    stocks: backup.stocks.length,
    buy_rounds: backup.stocks.reduce((sum, stock) => sum + (stock.buy_rounds?.length ?? 0), 0),
    realized_trades: backup.stocks.reduce((sum, stock) => sum + (stock.realized_trades?.length ?? 0), 0),
    dividend_payments: backup.stocks.reduce((sum, stock) => sum + (stock.dividend_payments?.length ?? 0), 0),
    cash_transactions: backup.cash_transactions?.length ?? 0,
    files: backup.files?.length ?? 0,
    informations: backup.informations?.length ?? 0,
  };
}

export function createBackupManifest(backup: BackupCollections): BackupManifest {
  return {
    format: 'my-port-v2-backup',
    files_scope: 'metadata-and-links',
    categories: getBackupCategoryCounts(backup),
  };
}

export function completeBackupData(backup: BackupData): BackupData {
  const complete = {
    ...backup,
    schema_version: BACKUP_SCHEMA_VERSION,
    files: backup.files ?? [],
    informations: backup.informations ?? [],
    cash_transactions: backup.cash_transactions ?? [],
    stocks: backup.stocks.map((stock) => ({
      ...stock,
      buy_rounds: stock.buy_rounds ?? [],
      realized_trades: stock.realized_trades ?? [],
      dividend_payments: stock.dividend_payments ?? [],
    })),
  };

  return {
    ...complete,
    manifest: createBackupManifest(complete),
  };
}
