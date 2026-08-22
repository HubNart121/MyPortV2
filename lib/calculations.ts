import type { BuyRound, StockWithStats, Stock, RealizedTrade, DividendPayment } from './types';

export const SOLD_OFF_STATUS = 'Sold Off';

export function resolveAutomaticStockStatus(currentStatus: string, activeShares: number): string {
  if (activeShares <= 0) return SOLD_OFF_STATUS;
  return currentStatus === SOLD_OFF_STATUS ? 'Hold' : currentStatus;
}

interface PositionEvent {
  kind: 'buy' | 'sell';
  date: string;
  createdAt: string;
  id: string;
  shares: number;
  price: number;
  fee: number;
  trade?: RealizedTrade;
}

export interface PositionTimeline {
  activeShares: number;
  currentCost: number;
  avgCost: number;
  recalculatedTrades: RealizedTrade[];
  buyAverageById: Record<string, number>;
  invalidSaleId: string | null;
}

export function calculatePositionTimeline(
  rounds: BuyRound[],
  sells: RealizedTrade[] = [],
  throughDate?: string
): PositionTimeline {
  const events: PositionEvent[] = [
    ...rounds.map((round) => ({
      kind: 'buy' as const,
      date: round.buy_date,
      createdAt: round.created_at ?? '',
      id: round.id,
      shares: Number(round.shares),
      price: Number(round.price),
      fee: Number(round.buy_fee ?? 0),
    })),
    ...sells.map((trade) => ({
      kind: 'sell' as const,
      date: trade.sell_date,
      createdAt: trade.created_at ?? '',
      id: trade.id,
      shares: Number(trade.shares),
      price: Number(trade.sell_price),
      fee: Number(trade.sell_fee ?? 0),
      trade,
    })),
  ]
    .filter((event) => !throughDate || event.date <= throughDate)
    .sort((a, b) => (
      a.date.localeCompare(b.date)
      || (a.kind === b.kind ? 0 : a.kind === 'buy' ? -1 : 1)
      || a.createdAt.localeCompare(b.createdAt)
      || a.id.localeCompare(b.id)
    ));

  let activeShares = 0;
  let currentCost = 0;
  let invalidSaleId: string | null = null;
  const recalculatedTrades: RealizedTrade[] = [];
  const buyAverageById: Record<string, number> = {};

  for (const event of events) {
    if (event.kind === 'buy') {
      activeShares += event.shares;
      currentCost += (event.price * event.shares) + event.fee;
      buyAverageById[event.id] = activeShares > 0 ? currentCost / activeShares : 0;
      continue;
    }

    const avgCostAtSell = activeShares > 0 ? currentCost / activeShares : 0;
    if (event.shares > activeShares + 0.0000001 && !invalidSaleId) {
      invalidSaleId = event.id;
    }

    const profit = (event.price * event.shares) - event.fee - (avgCostAtSell * event.shares);
    recalculatedTrades.push({
      ...event.trade!,
      avg_cost_at_sell: avgCostAtSell,
      profit,
    });

    currentCost -= avgCostAtSell * event.shares;
    activeShares -= event.shares;

    if (activeShares <= 0.0000001) {
      activeShares = 0;
      currentCost = 0;
    }
  }

  const avgCost = activeShares > 0 ? currentCost / activeShares : 0;
  return {
    activeShares,
    currentCost,
    avgCost,
    recalculatedTrades,
    buyAverageById,
    invalidSaleId,
  };
}

export function calcStats(
  stock: Stock,
  rounds: BuyRound[],
  sells: RealizedTrade[] = [],
  dividends: DividendPayment[] = []
): StockWithStats {
  const position = calculatePositionTimeline(rounds, sells);
  const active_shares = position.activeShares;
  
  const total_invested_all_time = rounds.reduce(
    (acc, r) => acc + (Number(r.price) * Number(r.shares)) + Number(r.buy_fee ?? 0),
    0
  );
  const avg_cost = position.avgCost;
  
  // Actually invested in current holdings
  const current_invested = position.currentCost;

  // Net realized profit = sum of all sell profits (can be negative if sold at loss)
  const total_realized_profit_net = position.recalculatedTrades.reduce((acc, s) => acc + s.profit, 0);
  const total_realized_cost_basis = position.recalculatedTrades.reduce(
    (acc, s) => acc + (s.avg_cost_at_sell * s.shares),
    0
  );
  const realized_profit_pct = total_realized_cost_basis > 0
    ? (total_realized_profit_net / total_realized_cost_basis) * 100
    : 0;
  
  const dividend_per_share = stock.dividend_per_share ?? 0;
  const total_dividend = dividend_per_share * active_shares;
  
  const dividend_yield_pct = avg_cost > 0 ? (dividend_per_share / avg_cost) * 100 : 0;
  const target_price = stock.target_price ?? 0;
  
  // Expected profit for current holdings
  const expected_profit = (target_price - avg_cost) * active_shares + total_dividend;
  const expected_profit_pct = current_invested > 0
    ? (expected_profit / current_invested) * 100
    : 0;

  const current_price = Number(stock.current_price ?? 0);
  const current_value = current_price * active_shares;
  const unrealized_profit = current_value - current_invested;
  const unrealized_profit_pct = current_invested > 0
    ? (unrealized_profit / current_invested) * 100
    : 0;
  
  const total_realized_profit = total_realized_profit_net; // net realized (profit - losses)
  const total_received_dividend = dividends.reduce((acc, d) => acc + d.net_amount, 0);
  const total_actual_return = total_realized_profit + total_received_dividend;
  const actual_return_pct = total_invested_all_time > 0
    ? (total_actual_return / total_invested_all_time) * 100
    : 0;
  // Yield % = total dividend received / total capital ever invested (all-time basis)
  const received_dividend_yield_pct = total_invested_all_time > 0
    ? (total_received_dividend / total_invested_all_time) * 100
    : 0;

  return {
    ...stock,
    status: resolveAutomaticStockStatus(stock.status, active_shares),
    buy_rounds: rounds,
    realized_trades: position.recalculatedTrades,
    dividend_payments: dividends,
    total_shares: active_shares, // We redefine total_shares to mean "Active Shares" for UI simplicity
    total_invested: current_invested,
    avg_cost,
    total_dividend,
    dividend_yield_pct,
    expected_profit,
    expected_profit_pct,
    current_value,
    unrealized_profit,
    unrealized_profit_pct,
    active_shares,
    total_realized_profit,
    total_realized_cost_basis,
    realized_profit_pct,
    total_received_dividend,
    total_actual_return,
    actual_return_pct,
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
