'use client';

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  ComposedChart,
  Line
} from 'recharts';

const COLORS = [
  '#F5A623', // Amber
  '#3A8FE0', // Blue
  '#27AE60', // Green
  '#E03A3A', // Red
  '#B06AE0', // Purple
  '#60C0C0', // Cyan
  '#FF9632', // Orange
];

interface ChartDataItem {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  portData: ChartDataItem[];
  sectorData: ChartDataItem[];
  assetData: ChartDataItem[];
  stackedData: {
    data: any[];
    sectors: string[];
  };
}

import { useState, useEffect } from 'react';

export function DashboardCharts({ portData, sectorData, assetData, stackedData }: DashboardChartsProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hasData = portData.length > 0 || sectorData.length > 0 || assetData.length > 0;

  if (!hasData) return null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // Filter out 'total' from the payload map to avoid showing it as a sector
      const sectors = payload.filter((item: any) => item.dataKey !== 'total');
      const isStacked = sectors.length > 1;
      
      return (
        <div style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-bright)', 
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          borderRadius: '2px'
        }}>
          <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            {payload[0].payload.name}
          </div>
          {sectors.map((item: any, i: number) => {
            const totalValue = sectors.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: i === sectors.length - 1 ? 0 : '4px' }}>
                <span className="mono" style={{ fontSize: '11px', color: item.color || item.fill }}>{item.name}:</span>
                <span className="mono" style={{ fontSize: '11px', fontWeight: 700 }}>
                  ฿{item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  {totalValue > 0 && ` (${((item.value / totalValue) * 100).toFixed(1)}%)`}
                </span>
              </div>
            );
          })}
          {isStacked && (
            <div style={{ marginTop: '8px', paddingTop: '4px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 700 }}>TOTAL:</span>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--amber)', fontWeight: 700 }}>
                ฿{payload[0].payload.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const renderTotalLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === undefined || value === null) return null;
    
    return (
      <text 
        x={x} 
        y={y - 12} 
        fill="var(--amber)" 
        textAnchor="middle" 
        className="mono"
        style={{ fontSize: '12px', fontWeight: 700 }}
      >
        ฿{(value / 1000).toFixed(0)}k
      </text>
    );
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = Math.max(outerRadius + 15, 85);
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.01) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="mono"
        style={{ fontSize: '12px', fontWeight: 700 }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
      
      {/* New Stacked Bar Chart - Top Priority as requested */}
      {stackedData.data.length > 0 && (
        <div className="panel animate-fade-in" style={{ width: '100%' }}>
          <div className="panel-header">
            <div className="panel-title">ยอดเงินลงทุนแยกตามประเภทพอร์ตและกลุ่มอุตสาหกรรม (Stacked Bar)</div>
          </div>
          <div style={{ height: isMobile ? '400px' : '350px', width: '100%', minWidth: 0, padding: isMobile ? '10px 5px' : '24px 20px 10px' }}>
            <ResponsiveContainer width="99%" height="100%">
              <ComposedChart
                data={stackedData.data}
                margin={{ top: isMobile ? 50 : 30, right: isMobile ? 10 : 30, left: isMobile ? -10 : 20, bottom: isMobile ? 40 : 20 }}
                barSize={isMobile ? 35 : 60}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-muted)" 
                  fontSize={isMobile ? 10 : 12} 
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  className="mono uppercase"
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  fontSize={isMobile ? 9 : 10}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickFormatter={(value) => `฿${(value / 1000)}k`}
                  className="mono"
                  width={isMobile ? 40 : 60}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }} />
                <Legend 
                  verticalAlign={isMobile ? "bottom" : "top"} 
                  align={isMobile ? "center" : "right"}
                  iconType="rect"
                  wrapperStyle={isMobile ? { paddingTop: '20px' } : { paddingBottom: '20px' }}
                  formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'Space Mono', textTransform: 'uppercase' }}>{value}</span>}
                />
                {stackedData.sectors.map((sector, index) => (
                  <Bar 
                    key={sector} 
                    dataKey={sector} 
                    name={sector}
                    stackId="a" 
                    fill={COLORS[index % COLORS.length]} 
                    radius={index === stackedData.sectors.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                    animationDuration={500}
                  />
                ))}
                
                {/* Invisible Line to provide the total labels at the "fingertips" */}
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="none" 
                  dot={false} 
                  activeDot={false}
                  legendType="none"
                  isAnimationActive={false}
                >
                  <LabelList content={renderTotalLabel} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Port Type Chart */}
        {portData.length > 0 && (
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">สัดส่วนตามประเภทพอร์ต (Port Type)</div>
            </div>
            <div style={{ height: '300px', width: '100%', padding: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    label={renderCustomizedLabel}
                    labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
                  >
                    {portData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'Space Mono', textTransform: 'uppercase' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Sector Chart */}
        {sectorData.length > 0 && (
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">สัดส่วนตามกลุ่มอุตสาหกรรม (Sector)</div>
            </div>
            <div style={{ height: '300px', width: '100%', padding: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    label={renderCustomizedLabel}
                    labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'Space Mono', textTransform: 'uppercase' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Asset Type Chart */}
        {assetData.length > 0 && (
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">สัดส่วนตามประเภทสินทรัพย์ (Asset)</div>
            </div>
            <div style={{ height: '300px', width: '100%', padding: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    label={renderCustomizedLabel}
                    labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
                  >
                    {assetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'Space Mono', textTransform: 'uppercase' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
