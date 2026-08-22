import { z } from 'zod';

const shortText = z.string().max(500);
const nullableText = z.string().max(10_000).nullable();
const positiveOrZero = z.number().finite().nonnegative();

const buyRoundSchema = z.object({
  id: z.string().min(1).max(200),
  stock_id: z.string().min(1).max(200),
  buy_date: z.string().min(1).max(64),
  price: positiveOrZero,
  shares: positiveOrZero,
  buy_fee: positiveOrZero.default(0),
  note: nullableText.default(null),
  link_url: nullableText.default(null),
  created_at: z.string().max(64),
});

const realizedTradeSchema = z.object({
  id: z.string().min(1).max(200),
  stock_id: z.string().min(1).max(200),
  sell_date: z.string().min(1).max(64),
  shares: positiveOrZero,
  sell_price: positiveOrZero,
  sell_fee: positiveOrZero.default(0),
  avg_cost_at_sell: positiveOrZero,
  profit: z.number().finite(),
  port_type: shortText,
  created_at: z.string().max(64),
});

const dividendPaymentSchema = z.object({
  id: z.string().min(1).max(200),
  stock_id: z.string().min(1).max(200),
  pay_date: z.string().min(1).max(64),
  dividend_per_share: positiveOrZero,
  shares_held: positiveOrZero,
  tax_pct: positiveOrZero,
  gross_amount: positiveOrZero,
  net_amount: positiveOrZero,
  created_at: z.string().max(64),
});

const stockSchema = z.object({
  id: z.string().min(1).max(200),
  symbol: z.string().min(1).max(40),
  name: nullableText,
  sector: nullableText,
  status: shortText,
  asset_type: shortText,
  port_type: shortText,
  dividend_per_share: positiveOrZero,
  current_price: positiveOrZero.default(0),
  target_price: positiveOrZero,
  graph_url: nullableText.default(null),
  link_url: nullableText.default(null),
  note: nullableText,
  created_at: z.string().max(64),
  updated_at: z.string().max(64),
  buy_rounds: z.array(buyRoundSchema).max(5_000),
  realized_trades: z.array(realizedTradeSchema).max(5_000),
  dividend_payments: z.array(dividendPaymentSchema).max(5_000).default([]),
});

const fileSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(500),
  detail: nullableText,
  link: nullableText,
  created_at: z.string().max(64),
  storage_kind: z.enum(['link', 'local']).default('link'),
  stored_name: z.string().uuid().nullable().optional().default(null),
  original_name: z.string().max(500).nullable().optional().default(null),
  mime_type: z.string().max(255).nullable().optional().default(null),
  size_bytes: z.number().int().nonnegative().max(20 * 1024 * 1024).nullable().optional().default(null),
});

const informationSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  link: nullableText,
  detail: nullableText,
  created_at: z.string().max(64),
});

const cashTransactionSchema = z.object({
  id: z.string().min(1).max(200),
  transaction_date: z.string().min(1).max(64),
  type: z.enum(['deposit', 'withdrawal']),
  amount: z.number().finite().positive(),
  port_type: shortText,
  note: nullableText,
  created_at: z.string().max(64),
  updated_at: z.string().max(64),
});

export const backupCategoryCountsSchema = z.object({
  stocks: z.number().int().nonnegative(),
  buy_rounds: z.number().int().nonnegative(),
  realized_trades: z.number().int().nonnegative(),
  dividend_payments: z.number().int().nonnegative(),
  cash_transactions: z.number().int().nonnegative(),
  files: z.number().int().nonnegative(),
  informations: z.number().int().nonnegative(),
});

const backupManifestSchema = z.object({
  format: z.literal('my-port-v2-backup'),
  files_scope: z.literal('metadata-and-links'),
  categories: backupCategoryCountsSchema,
});

export const backupDataSchema = z.object({
  version: z.string().min(1).max(100),
  schema_version: z.number().int().min(1).max(4).optional(),
  exported_at: z.string().min(1).max(64),
  manifest: backupManifestSchema.optional(),
  stocks: z.array(stockSchema).max(1_000),
  files: z.array(fileSchema).max(2_000).default([]),
  informations: z.array(informationSchema).max(2_000).default([]),
  cash_transactions: z.array(cashTransactionSchema).max(10_000).default([]),
}).superRefine((backup, context) => {
  if (!backup.manifest) return;

  const actual = {
    stocks: backup.stocks.length,
    buy_rounds: backup.stocks.reduce((sum, stock) => sum + stock.buy_rounds.length, 0),
    realized_trades: backup.stocks.reduce((sum, stock) => sum + stock.realized_trades.length, 0),
    dividend_payments: backup.stocks.reduce((sum, stock) => sum + stock.dividend_payments.length, 0),
    cash_transactions: backup.cash_transactions.length,
    files: backup.files.length,
    informations: backup.informations.length,
  };

  for (const [category, count] of Object.entries(actual)) {
    if (backup.manifest.categories[category as keyof typeof actual] !== count) {
      context.addIssue({
        code: 'custom',
        path: ['manifest', 'categories', category],
        message: `Backup category count mismatch: ${category}`,
      });
    }
  }
});
