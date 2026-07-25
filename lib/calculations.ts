import type { BuyRound, StockWithStats, Stock, RealizedTrade, DividendPayment } from './types';

export function calcStats(
  stock: Stock,
  rounds: BuyRound[],
  sells: RealizedTrade[] = [],
  dividends: DividendPayment[] = []
): StockWithStats {
  const total_bought_shares = rounds.reduce((acc, r) => acc + r.shares, 0);
  const total_sold_shares = sells.reduce((acc, s) => acc + s.shares, 0);
  const active_shares = Math.max(0, total_bought_shares - total_sold_shares);
  
  const total_invested_all_time = rounds.reduce((acc, r) => acc + r.price * r.shares, 0);
  const avg_cost = total_bought_shares > 0 ? total_invested_all_time / total_bought_shares : 0;
  
  // Actually invested in current holdings
  const current_invested = active_shares * avg_cost;

  // Net realized profit = sum of all sell profits (can be negative if sold at loss)
  const total_realized_profit_net = sells.reduce((acc, s) => acc + s.profit, 0);
  
  const dividend_per_share = stock.dividend_per_share ?? 0;
  const total_dividend = dividend_per_share * active_shares;
  
  const dividend_yield_pct = avg_cost > 0 ? (dividend_per_share / avg_cost) * 100 : 0;
  const target_price = stock.target_price ?? 0;
  
  // Expected profit for current holdings
  const expected_profit = (target_price - avg_cost) * active_shares + total_dividend;
  
  const total_realized_profit = total_realized_profit_net; // net realized (profit - losses)
  const total_received_dividend = dividends.reduce((acc, d) => acc + d.net_amount, 0);
  // Yield % = total dividend received / total capital ever invested (all-time basis)
  const received_dividend_yield_pct = total_invested_all_time > 0
    ? (total_received_dividend / total_invested_all_time) * 100
    : 0;

  return {
    ...stock,
    buy_rounds: rounds,
    realized_trades: sells,
    dividend_payments: dividends,
    total_shares: active_shares, // We redefine total_shares to mean "Active Shares" for UI simplicity
    total_invested: current_invested,
    avg_cost,
    total_dividend,
    dividend_yield_pct,
    expected_profit,
    active_shares,
    total_realized_profit,
    total_received_dividend,
    received_dividend_yield_pct,
    total_invested_all_time,
  };
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(value: number): string {
  if (value < 0) {
    return `-฿${formatNumber(Math.abs(value))}`;
  }
  return `฿${formatNumber(value)}`;
}

export function formatThaiYear(yearCE: string | number): string {
  const y = typeof yearCE === 'number' ? yearCE : parseInt(String(yearCE), 10);
  if (isNaN(y)) return String(yearCE);
  if (y > 2400) return String(y);
  return String(y + 543);
}

export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const yearBE = year > 2400 ? year : year + 543;
  return `${day}/${month}/${yearBE}`;
}
