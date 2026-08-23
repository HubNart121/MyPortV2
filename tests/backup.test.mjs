import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BACKUP_SCHEMA_VERSION,
  completeBackupData,
  getBackupCategoryCounts,
} from '../lib/backup.ts';

function legacyBackup() {
  return {
    version: '4.0 (legacy backup)',
    schema_version: 4,
    exported_at: '2026-08-22T00:00:00.000Z',
    stocks: [{
      id: 'stock-1',
      symbol: 'PTT',
      name: null,
      sector: null,
      status: 'Hold',
      asset_type: 'StockThai',
      port_type: 'Private',
      dividend_per_share: 2,
      current_price: 30,
      target_price: 35,
      graph_url: null,
      link_url: null,
      note: null,
      created_at: '2026-08-22T00:00:00.000Z',
      updated_at: '2026-08-22T00:00:00.000Z',
      buy_rounds: [{
        id: 'buy-1',
        stock_id: 'stock-1',
        buy_date: '2026-08-22',
        price: 30,
        shares: 100,
        note: null,
        link_url: null,
        created_at: '2026-08-22T00:00:00.000Z',
      }],
      realized_trades: [],
    }],
  };
}

test('upgrades a legacy backup with current defaults and manifest', () => {
  const upgraded = completeBackupData(legacyBackup());

  assert.equal(BACKUP_SCHEMA_VERSION, 5);
  assert.equal(upgraded.schema_version, 5);
  assert.equal(upgraded.stocks[0].expected_dividend_per_year, 0);
  assert.equal(upgraded.stocks[0].risk_category, null);
  assert.equal(upgraded.stocks[0].buy_rounds[0].buy_fee, 0);
  assert.equal(upgraded.stocks[0].buy_rounds[0].stock_id, 'stock-1');
  assert.deepEqual(upgraded.stocks[0].dividend_payments, []);
  assert.deepEqual(upgraded.files, []);
  assert.deepEqual(upgraded.informations, []);
  assert.deepEqual(upgraded.cash_transactions, []);
  assert.deepEqual(upgraded.manifest?.excluded_categories, ['activity_logs']);
  assert.deepEqual(upgraded.manifest?.categories, getBackupCategoryCounts(upgraded));
});

test('preserves the annual expected dividend in a current backup', () => {
  const current = legacyBackup();
  current.stocks[0].expected_dividend_per_year = 11;
  current.stocks[0].risk_category = '🟢 Income / Dividend';

  const completed = completeBackupData(current);

  assert.equal(completed.stocks[0].expected_dividend_per_year, 11);
  assert.equal(completed.stocks[0].risk_category, '🟢 Income / Dividend');
});
