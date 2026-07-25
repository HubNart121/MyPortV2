export const STOCK_STATUS = ['Hold', 'Plan-buy', 'Plan-sell', 'Choice'] as const;
export type StockStatus = string;

export const ASSET_TYPE = ['StockThai', 'DR', 'ETF', 'ReitThai', 'Fund', 'FundAllocation'] as const;
export type AssetType = string;

export const PORT_TYPE = ['Private', 'Business'] as const;
export type PortType = string;

export interface Stock {
  id: string;
  symbol: string;
  name: string | null;
  sector: string | null;
  status: StockStatus;
  asset_type: AssetType;
  port_type: PortType;
  dividend_per_share: number;
  target_price: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  buy_rounds?: BuyRound[];
  realized_trades?: RealizedTrade[];
  dividend_payments?: DividendPayment[];
}

export interface RealizedTrade {
  id: string;
  stock_id: string;
  sell_date: string;
  shares: number;
  sell_price: number;
  avg_cost_at_sell: number;
  profit: number;
  port_type: PortType;
  created_at: string;
}

export interface BuyRound {
  id: string;
  stock_id: string;
  buy_date: string;
  price: number;
  shares: number;
  created_at: string;
}

export interface DividendPayment {
  id: string;
  stock_id: string;
  pay_date: string;
  dividend_per_share: number;
  shares_held: number;
  tax_pct: number;
  gross_amount: number;
  net_amount: number;
  created_at: string;
}

export interface StockWithStats extends Stock {
  total_shares: number;
  total_invested: number;
  avg_cost: number;
  total_dividend: number;
  dividend_yield_pct: number;
  expected_profit: number;
  active_shares: number;
  total_realized_profit: number;
  total_received_dividend: number;
  received_dividend_yield_pct: number;
  total_invested_all_time: number;
}

export interface BackupData {
  version: string;
  exported_at: string;
  stocks: (Stock & { buy_rounds: BuyRound[]; realized_trades: RealizedTrade[]; dividend_payments?: DividendPayment[] })[];
  files?: FileResource[];
  informations?: InfoResource[];
}

export interface FileResource {
  id: string;
  name: string;
  detail: string | null;
  link: string | null;
  created_at: string;
}

export interface InfoResource {
  id: string;
  title: string;
  link: string | null;
  detail: string | null;
  created_at: string;
}
