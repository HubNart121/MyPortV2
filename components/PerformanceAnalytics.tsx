'use client';

import { useState, useMemo } from 'react';
import type { RealizedTrade, DividendPayment } from '@/lib/types';
import { formatCurrency, formatThaiYear } from '@/lib/calculations';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceAnalyticsProps {
  allTrades: (RealizedTrade & { symbol: string; port_type?: string })[];
  allDividends: (DividendPayment & { symbol: string; port_type?: string })[];
  allBuys?: { buy_date: string; port_type?: string }[];
  selectedPort?: string;
  onPortChange?: (port: string) => void;
}

type PeriodPreset = 'all' | 'this_year' | '6m' | '3m' | 'custom';

const extractCEYear = (dateStr?: string): string => {
  if (!dateStr) return 'Unknown';
  const rawYr = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(rawYr)) return 'Unknown';
  const yrCE = rawYr > 2400 ? rawYr - 543 : rawYr;
  return String(yrCE);
};

export function PerformanceAnalytics({
  allTrades,
  allDividends,
  allBuys = [],
  selectedPort: externalPort,
  onPortChange,
}: PerformanceAnalyticsProps) {
  const [preset, setPreset] = useState<PeriodPreset>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [internalPort, setInternalPort] = useState<string>('All');

  const selectedPort = externalPort !== undefined ? externalPort : internalPort;

  const handlePortSelect = (port: string) => {
    setInternalPort(port);
    if (onPortChange) onPortChange(port);
  };

  // Extract unique port types
  const availablePorts = useMemo(() => {
    const ports = new Set<string>();
    allTrades.forEach((t) => t.port_type && ports.add(t.port_type));
    allDividends.forEach((d) => d.port_type && ports.add(d.port_type));
    allBuys.forEach((b) => b.port_type && ports.add(b.port_type));
    ports.add('Private');
    ports.add('Business');
    return ['All', ...Array.from(ports).sort()];
  }, [allTrades, allDividends, allBuys]);

  // Filter trades, dividends, and buys by Port Type first
  const portFilteredTrades = useMemo(() => {
    if (selectedPort === 'All') return allTrades;
    return allTrades.filter((t) => (t.port_type || 'Private') === selectedPort);
  }, [allTrades, selectedPort]);

  const portFilteredDividends = useMemo(() => {
    if (selectedPort === 'All') return allDividends;
    return allDividends.filter((d) => (d.port_type || 'Private') === selectedPort);
  }, [allDividends, selectedPort]);

  const portFilteredBuys = useMemo(() => {
    if (selectedPort === 'All') return allBuys;
    return allBuys.filter((b) => (b.port_type || 'Private') === selectedPort);
  }, [allBuys, selectedPort]);

  // Compute active date boundaries
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'this_year') {
      const yearStart = `${now.getFullYear()}-01-01`;
      return { startDate: yearStart, endDate: todayStr };
    }
    if (preset === '6m') {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return { startDate: d.toISOString().slice(0, 10), endDate: todayStr };
    }
    if (preset === '3m') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return { startDate: d.toISOString().slice(0, 10), endDate: todayStr };
    }
    if (preset === 'custom') {
      return { startDate: customStart, endDate: customEnd };
    }
    return { startDate: '', endDate: '' };
  }, [preset, customStart, customEnd]);

  // Filter trades and dividends by date range
  const filteredTrades = useMemo(() => {
    return portFilteredTrades.filter((t) => {
      if (startDate && t.sell_date < startDate) return false;
      if (endDate && t.sell_date > endDate) return false;
      return true;
    });
  }, [portFilteredTrades, startDate, endDate]);

  const filteredDividends = useMemo(() => {
    return portFilteredDividends.filter((d) => {
      if (startDate && d.pay_date < startDate) return false;
      if (endDate && d.pay_date > endDate) return false;
      return true;
    });
  }, [portFilteredDividends, startDate, endDate]);

  // Period summary metrics
  const periodRealizedProfit = useMemo(
    () => filteredTrades.reduce((acc, t) => acc + t.profit, 0),
    [filteredTrades]
  );
  const periodNetDividend = useMemo(
    () => filteredDividends.reduce((acc, d) => acc + d.net_amount, 0),
    [filteredDividends]
  );
  const periodTotalReturn = periodRealizedProfit + periodNetDividend;

  // Trade Win / Loss and Max Gain / Loss % Stats
  const tradeStats = useMemo(() => {
    let winCount = 0;
    let lossCount = 0;
    let maxGainPct = 0;
    let maxLossPct = 0;

    filteredTrades.forEach((t) => {
      if (t.profit > 0) winCount++;
      else if (t.profit < 0) lossCount++;

      // Compute Return % for this trade
      const totalCost = t.avg_cost_at_sell && t.avg_cost_at_sell > 0
        ? t.shares * t.avg_cost_at_sell
        : (t.sell_price * t.shares) - t.profit;

      const pct = totalCost > 0 ? (t.profit / totalCost) * 100 : 0;

      if (pct > maxGainPct) maxGainPct = pct;
      if (pct < maxLossPct) maxLossPct = pct;
    });

    const totalClosed = winCount + lossCount;
    const winRate = totalClosed > 0 ? (winCount / totalClosed) * 100 : 0;

    return {
      winCount,
      lossCount,
      totalClosed,
      winRate,
      maxGainPct,
      maxLossPct,
    };
  }, [filteredTrades]);

  // Yearly breakdown data — uses filtered data when a period is active, all-time when 'all'
  const yearlyData = useMemo(() => {
    const trades = preset === 'all' ? portFilteredTrades : filteredTrades;
    const dividends = preset === 'all' ? portFilteredDividends : filteredDividends;

    const map: Record<string, { year: string; realizedProfit: number; netDividend: number; total: number }> = {};

    // Initialize years from buy history if present
    if (preset === 'all' && portFilteredBuys.length > 0) {
      portFilteredBuys.forEach((b) => {
        const yr = extractCEYear(b.buy_date);
        if (yr && yr !== 'Unknown' && !map[yr]) {
          map[yr] = { year: yr, realizedProfit: 0, netDividend: 0, total: 0 };
        }
      });
    }

    trades.forEach((t) => {
      const yr = extractCEYear(t.sell_date);
      if (!map[yr]) map[yr] = { year: yr, realizedProfit: 0, netDividend: 0, total: 0 };
      map[yr].realizedProfit += t.profit;
      map[yr].total += t.profit;
    });

    dividends.forEach((d) => {
      const yr = extractCEYear(d.pay_date);
      if (!map[yr]) map[yr] = { year: yr, realizedProfit: 0, netDividend: 0, total: 0 };
      map[yr].netDividend += d.net_amount;
      map[yr].total += d.net_amount;
    });

    const list = Object.values(map);
    list.sort((a, b) => a.year.localeCompare(b.year));
    return list;
  }, [portFilteredTrades, portFilteredDividends, portFilteredBuys, filteredTrades, filteredDividends, preset]);

  // Table sorted descending
  const yearlyTableData = useMemo(() => {
    return [...yearlyData].sort((a, b) => b.year.localeCompare(a.year));
  }, [yearlyData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-bright)',
            padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            borderRadius: '2px',
          }}
        >
          <div className="mono" style={{ fontSize: '11px', color: 'var(--amber)', fontWeight: 700, marginBottom: '6px' }}>
            ปี พ.ศ. {formatThaiYear(label)}
          </div>
          {payload.map((item: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
              <span className="mono" style={{ fontSize: '11px', color: item.color }}>
                {item.name}:
              </span>
              <span className="mono" style={{ fontSize: '11px', fontWeight: 700 }}>
                {formatCurrency(item.value)}
              </span>
            </div>
          ))}
          {payload.length > 1 && (
            <div
              style={{
                marginTop: '6px',
                paddingTop: '6px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <span className="mono" style={{ fontSize: '11px', fontWeight: 700 }}>
                รวมผลตอบแทน:
              </span>
              <span className="mono green" style={{ fontSize: '11px', fontWeight: 700 }}>
                {formatCurrency((payload[0]?.value || 0) + (payload[1]?.value || 0))}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const hasAnalyticsData = allTrades.length > 0 || allDividends.length > 0 || allBuys.length > 0;

  if (!hasAnalyticsData) return null;

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Section Header */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div
          className="panel-header"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justify: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>
            <div className="panel-title" style={{ fontSize: '15px' }}>
              📊 วิเคราะห์ผลตอบแทนจริง & ปันผลสุทธิ (Realized Performance Analytics)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              สรุปรายได้จากกำไรการขายและเงินปันผลสุทธิรับจริงตามช่วงเวลา
            </div>
          </div>

          {/* Presets & Port Filter Control Bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Port Type Filter */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'var(--bg-primary)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '6px', fontWeight: 600 }}>Port:</span>
              {availablePorts.map((p) => (
                <button
                  key={p}
                  className={`btn btn-xs ${selectedPort === p ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                  onClick={() => handlePortSelect(p)}
                >
                  {p === 'All' ? 'ทั้งหมด' : p}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className={`btn btn-sm ${preset === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPreset('all')}
              >
                ทั้งหมด
              </button>
              <button
                className={`btn btn-sm ${preset === 'this_year' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPreset('this_year')}
              >
                ปีนี้ (พ.ศ. {formatThaiYear(new Date().getFullYear())})
              </button>
              <button
                className={`btn btn-sm ${preset === '6m' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPreset('6m')}
              >
                6 เดือนล่าสุด
              </button>
              <button
                className={`btn btn-sm ${preset === '3m' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPreset('3m')}
              >
                3 เดือนล่าสุด
              </button>
              <button
                className={`btn btn-sm ${preset === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPreset('custom')}
              >
                กำหนดเอง...
              </button>
            </div>
          </div>
        </div>

        {/* Custom Range Inputs */}
        {preset === 'custom' && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              fontSize: '12px',
            }}
          >
            <span>ตั้งแต่วันที่:</span>
            <input
              type="date"
              className="form-input mono"
              style={{ width: '150px' }}
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span>ถึงวันที่:</span>
            <input
              type="date"
              className="form-input mono"
              style={{ width: '150px' }}
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
            {(customStart || customEnd) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setCustomStart('');
                  setCustomEnd('');
                }}
              >
                ✕ เคลียร์วันที่
              </button>
            )}
          </div>
        )}
      </div>

      {/* Period Summary Cards */}
      <div className="animate-stagger stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--amber)' }}>
          <div className="stat-label">กำไรจากการขายจริง</div>
          <div className={`stat-value mono ${periodRealizedProfit >= 0 ? 'amber' : 'red'}`}>
            {formatCurrency(periodRealizedProfit)}
          </div>
          <div className="stat-sub" style={{ color: 'var(--text-secondary)' }}>
            {filteredTrades.length} รายการขายในช่วงเวลาที่เลือก
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid var(--green)' }}>
          <div className="stat-label">เงินปันผลสุทธิรับจริง</div>
          <div className="stat-value green mono">{formatCurrency(periodNetDividend)}</div>
          <div className="stat-sub" style={{ color: 'var(--text-secondary)' }}>
            {filteredDividends.length} รายการปันผลหลังหักภาษี
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #3A8FE0' }}>
          <div className="stat-label">ผลตอบแทนรวมจริง</div>
          <div className={`stat-value mono ${periodTotalReturn >= 0 ? 'green' : 'red'}`}>
            {formatCurrency(periodTotalReturn)}
          </div>
          <div className="stat-sub" style={{ color: 'var(--text-secondary)' }}>
            กำไรจากการขาย + เงินปันผลรับจริง
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #B06AE0' }}>
          <div className="stat-label">สถิติการปิดขาย (WIN / LOSS)</div>
          <div className="stat-value mono" style={{ fontSize: '18px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>Win {tradeStats.winCount}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>/</span>
            <span style={{ color: 'var(--red)', fontWeight: 700 }}>Loss {tradeStats.lossCount}</span>
            {tradeStats.totalClosed > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                ({tradeStats.winRate.toFixed(0)}% Win)
              </span>
            )}
          </div>
          <div className="stat-sub" style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', flexWrap: 'wrap' }}>
            <span>
              กำไรสูงสุด:{' '}
              <strong className="green mono">
                {tradeStats.maxGainPct > 0 ? `+${tradeStats.maxGainPct.toFixed(2)}%` : '0.00%'}
              </strong>
            </span>
            <span style={{ color: 'var(--border-bright)' }}>|</span>
            <span>
              ขาดทุนสูงสุด:{' '}
              <strong className="red mono">
                {tradeStats.maxLossPct < 0 ? `${tradeStats.maxLossPct.toFixed(2)}%` : '0.00%'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Yearly Breakdown Chart & Table Grid */}
      {yearlyData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', minWidth: 0 }}>
          {/* Yearly Bar Chart */}
          <div className="panel" style={{ minWidth: 0 }}>
            <div className="panel-header">
              <div className="panel-title">เปรียบเทียบผลตอบแทนจริงรายปี (Yearly Performance)</div>
            </div>
            <div style={{ height: '320px', width: '100%', minWidth: 0, padding: '20px 10px 10px' }}>
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={yearlyData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    className="mono"
                    tickFormatter={(val) => formatThaiYear(val)}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickFormatter={(val) => `฿${val / 1000}k`}
                    className="mono"
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="rect"
                    wrapperStyle={{ paddingBottom: '16px' }}
                    formatter={(val) => (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'Space Mono' }}>
                        {val}
                      </span>
                    )}
                  />
                  <Bar dataKey="realizedProfit" name="กำไรจากการขาย" fill="#F5A623" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="netDividend" name="เงินปันผลสุทธิ" fill="#27AE60" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Yearly Summary Table */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">ตารางสรุปผลตอบแทนรายปี (พ.ศ.)</div>
            </div>
            <div style={{ padding: '0', overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ปี (พ.ศ.)</th>
                    <th style={{ textAlign: 'right' }}>กำไรจากการขาย</th>
                    <th style={{ textAlign: 'right' }}>เงินปันผลสุทธิ</th>
                    <th style={{ textAlign: 'right' }}>ผลตอบแทนรวม</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyTableData.map((row) => (
                    <tr key={row.year}>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--amber)' }}>
                        ปี พ.ศ. {formatThaiYear(row.year)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: row.realizedProfit > 0 ? 'var(--green)' : row.realizedProfit < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                        {row.realizedProfit === 0 ? '—' : formatCurrency(row.realizedProfit)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>
                        {row.netDividend === 0 ? '—' : formatCurrency(row.netDividend)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: row.total >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-surface)', fontWeight: 700 }}>
                    <td style={{ fontSize: '12px' }}>
                      {preset === 'all' ? 'รวมประวัติทั้งหมด:' : 'รวมในช่วงที่เลือก:'}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', color: periodRealizedProfit > 0 ? 'var(--amber)' : periodRealizedProfit < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                      {formatCurrency(periodRealizedProfit)}
                    </td>
                    <td className="mono green" style={{ textAlign: 'right' }}>
                      {formatCurrency(periodNetDividend)}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: '14px', color: periodTotalReturn >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {formatCurrency(periodTotalReturn)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
