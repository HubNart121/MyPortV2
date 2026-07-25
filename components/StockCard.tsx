'use client';

import Link from 'next/link';
import type { StockWithStats } from '@/lib/types';
import { formatNumber, formatCurrency } from '@/lib/calculations';
import { StatusBadge, AssetBadge, PortBadge } from './Badges';

interface StockCardProps {
  stock: StockWithStats;
}

export function StockCard({ stock }: StockCardProps) {
  const profitClass =
    stock.expected_profit > 0 ? 'profit' : stock.expected_profit < 0 ? 'loss' : 'neutral';

  const computed_dividend = (stock.dividend_per_share || 0) * (stock.total_shares || 0);

  return (
    <Link
      href={`/stocks/${stock.id}`}
      className="stock-row stock-grid-layout"
    >
      {/* Symbol + name */}
      <div>
        <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--amber)' }}>
          {stock.symbol}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stock.name || '—'}{stock.sector ? ` · ${stock.sector}` : ''}
        </div>
      </div>

      {/* Avg Cost */}
      <div>
        <div className="internal-label" style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
          Avg Cost
        </div>
        <div className="mono" style={{ fontWeight: 700 }}>
          {stock.total_shares > 0 ? formatCurrency(stock.avg_cost) : '—'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {stock.total_shares > 0 ? `${formatNumber(stock.total_shares, 0)} shares` : 'No rounds'}
        </div>
      </div>

      {/* Invested */}
      <div className="tablet-hide">
        <div className="internal-label" style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
          Invested
        </div>
        <div className="mono" style={{ fontWeight: 700 }}>
          {stock.total_shares > 0 ? formatCurrency(stock.total_invested) : '—'}
        </div>
      </div>

      {/* Dividend - Trigger Rebuild */}
      <div className="tablet-hide">
        <div className="internal-label" style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
          Div Yield
        </div>
        <div className="mono" style={{ color: 'var(--green)', fontWeight: 700 }}>
          {stock.dividend_yield_pct > 0 ? `${formatNumber(stock.dividend_yield_pct)}%` : '—'}
        </div>
        <div className="mono" style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600, marginTop: '1px' }}>
          {computed_dividend > 0 ? `฿${formatNumber(computed_dividend)}` : ''}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {stock.dividend_per_share > 0 ? `฿${formatNumber(stock.dividend_per_share, 4)}/share` : ''}
        </div>
      </div>

      {/* Expected Profit */}
      <div className="tablet-hide">
        <div className="internal-label" style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
          Expected Net
        </div>
        <div className={`mono ${profitClass}`} style={{ fontWeight: 700 }}>
          {stock.total_shares > 0 ? formatCurrency(stock.expected_profit) : '—'}
        </div>
        {stock.target_price > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            target ฿{formatNumber(stock.target_price)}
          </div>
        )}
      </div>

      {/* Mobile Only Stats Section */}
      <div className="mobile-stats-grid">
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Invested</div>
          <div className="mono" style={{ fontSize: '13px', fontWeight: 700 }}>{formatCurrency(stock.total_invested)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Expected Net</div>
          <div className={`mono ${profitClass}`} style={{ fontSize: '13px', fontWeight: 700 }}>{formatCurrency(stock.expected_profit)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Div Yield</div>
          <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>{formatNumber(stock.dividend_yield_pct)}%</div>
          {stock.total_dividend > 0 && (
            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>฿{formatNumber(stock.total_dividend)}</div>
          )}
        </div>
      </div>

      {/* Badges Container */}
      <div className="stock-badges-container">
        <PortBadge portType={stock.port_type} />
        <StatusBadge status={stock.status} />
        <AssetBadge assetType={stock.asset_type} />
      </div>
    </Link>
  );
}
