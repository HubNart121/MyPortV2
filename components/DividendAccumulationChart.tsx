'use client';

import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DividendPayment } from '@/lib/types';
import { formatCurrency, formatNumber, formatThaiYear } from '@/lib/calculations';

const CHART_INITIAL_DIMENSION = { width: 1, height: 1 };

interface DividendAccumulationChartProps {
  dividends: DividendPayment[];
  symbol: string;
}

interface AnnualDividendData {
  yearCE: number;
  year: string;
  gross: number;
  tax: number;
  net: number;
  cumulative: number;
  payments: number;
}

function formatAxisCurrency(value: number): string {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `฿${formatNumber(value / 1_000_000, 1)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `฿${formatNumber(value / 1_000, 0)}k`;
  }

  return `฿${formatNumber(value, 0)}`;
}

function DividendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload as AnnualDividendData | undefined;
  if (!item) return null;

  return (
    <div
      style={{
        minWidth: '230px',
        padding: '12px 14px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-bright)',
        borderRadius: '4px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      <div
        className="mono"
        style={{
          marginBottom: '10px',
          color: 'var(--amber)',
          fontSize: '12px',
          fontWeight: 700,
        }}
      >
        ปี พ.ศ. {item.year}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>ปันผลสุทธิปีนี้</span>
          <strong className="mono green">{formatCurrency(item.net)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>ปันผลสะสม</span>
          <strong className="mono" style={{ color: '#3A8FE0' }}>
            {formatCurrency(item.cumulative)}
          </strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px' }}>
          <span style={{ color: 'var(--text-muted)' }}>ยอดก่อนภาษี</span>
          <span className="mono">{formatCurrency(item.gross)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px' }}>
          <span style={{ color: 'var(--text-muted)' }}>ภาษีหัก ณ ที่จ่าย</span>
          <span className="mono red">-{formatCurrency(item.tax)}</span>
        </div>
        <div
          style={{
            marginTop: '2px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          {item.payments} รายการรับปันผล
        </div>
      </div>
    </div>
  );
}

export function DividendAccumulationChart({
  dividends,
  symbol,
}: DividendAccumulationChartProps) {
  const annualData = useMemo<AnnualDividendData[]>(() => {
    const annualMap = new Map<
      number,
      Omit<AnnualDividendData, 'year' | 'cumulative'>
    >();

    dividends.forEach((dividend) => {
      const yearCE = Number(dividend.pay_date.slice(0, 4));
      if (!Number.isFinite(yearCE)) return;

      const existing = annualMap.get(yearCE) ?? {
        yearCE,
        gross: 0,
        tax: 0,
        net: 0,
        payments: 0,
      };

      existing.gross += dividend.gross_amount;
      existing.tax += dividend.gross_amount - dividend.net_amount;
      existing.net += dividend.net_amount;
      existing.payments += 1;
      annualMap.set(yearCE, existing);
    });

    let cumulative = 0;

    return Array.from(annualMap.values())
      .sort((a, b) => a.yearCE - b.yearCE)
      .map((item) => {
        cumulative += item.net;
        return {
          ...item,
          year: formatThaiYear(item.yearCE),
          cumulative,
        };
      });
  }, [dividends]);

  const totalNet = annualData.at(-1)?.cumulative ?? 0;
  const totalGross = annualData.reduce((sum, item) => sum + item.gross, 0);
  const totalTax = annualData.reduce((sum, item) => sum + item.tax, 0);
  const yearCount = annualData.length;

  return (
    <div className="panel" style={{ marginTop: '24px', minWidth: 0 }}>
      <div
        className="panel-header"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="panel-title">ปันผลจริงสะสมรายปี</div>
          <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '11px' }}>
            ปันผลสุทธิที่ได้รับจริงของ {symbol} หลังหักภาษี
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="stat-label">ปันผลสะสมทั้งหมด</div>
          <div className="mono green" style={{ marginTop: '3px', fontSize: '20px', fontWeight: 700 }}>
            {formatCurrency(totalNet)}
          </div>
        </div>
      </div>

      {annualData.length === 0 ? (
        <div
          style={{
            padding: '42px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ marginBottom: '8px', fontSize: '26px' }}>▥</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
            ยังไม่มีข้อมูลปันผลจริงสำหรับหุ้นตัวนี้
          </div>
          <div style={{ marginTop: '5px', fontSize: '11px' }}>
            เพิ่มรายการในส่วนประวัติรับเงินปันผล แล้วกราฟจะสรุปยอดรายปีและยอดสะสมให้อัตโนมัติ
          </div>
        </div>
      ) : (
        <>
          <div
            role="img"
            aria-label={`กราฟปันผลสุทธิรายปีและปันผลสะสมของ ${symbol}`}
            style={{ width: '100%', height: '340px', minWidth: 0, padding: '20px 10px 4px' }}
          >
            <ResponsiveContainer
              width="99%"
              height="100%"
              minWidth={0}
              initialDimension={CHART_INITIAL_DIMENSION}
            >
              <ComposedChart
                data={annualData}
                margin={{ top: 10, right: 24, left: 8, bottom: 12 }}
                barSize={44}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="year"
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  fontSize={11}
                  className="mono"
                  label={{
                    value: 'ปี พ.ศ.',
                    position: 'insideBottom',
                    offset: -8,
                    fill: 'var(--text-muted)',
                    fontSize: 10,
                  }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickFormatter={formatAxisCurrency}
                  fontSize={10}
                  width={68}
                  className="mono"
                />
                <Tooltip
                  content={<DividendTooltip />}
                  cursor={{ fill: 'var(--bg-hover)', opacity: 0.45 }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="rect"
                  wrapperStyle={{ paddingBottom: '16px' }}
                  formatter={(value) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {value}
                    </span>
                  )}
                />
                <Bar
                  dataKey="net"
                  name="ปันผลสุทธิรายปี"
                  fill="#27AE60"
                  radius={[5, 5, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="ปันผลสะสม"
                  stroke="#3A8FE0"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3A8FE0', stroke: 'var(--bg-secondary)', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1px',
              marginTop: '8px',
              borderTop: '1px solid var(--border)',
              background: 'var(--border)',
            }}
          >
            {[
              { label: 'ยอดก่อนภาษี', value: formatCurrency(totalGross), color: 'var(--text-primary)' },
              { label: 'ภาษีรวม', value: `-${formatCurrency(totalTax)}`, color: 'var(--red)' },
              { label: 'สุทธิสะสม', value: formatCurrency(totalNet), color: 'var(--green)' },
              { label: 'ช่วงเวลาที่มีข้อมูล', value: `${yearCount} ปี`, color: 'var(--amber)' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '13px 16px', background: 'var(--bg-secondary)' }}>
                <div className="stat-label">{item.label}</div>
                <div
                  className="mono"
                  style={{ marginTop: '4px', color: item.color, fontSize: '14px', fontWeight: 700 }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
