'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatCurrency, formatNumber, formatThaiDate } from '@/lib/calculations';
import { ThaiDateInput } from './ThaiDateInput';

const schema = z.object({
  sell_date: z.string().min(1, 'ระบุวันที่ขาย'),
  shares: z.number().min(0.0001, 'ต้องขายมากกว่า 0 หุ้น'),
  sell_price: z.number().min(0.0001, 'ระบุราคาขาย'),
});

export type SellFormData = z.infer<typeof schema>;

interface SellModalProps {
  symbol: string;
  totalShares: number;
  avgCost: number;
  onClose: () => void;
  onSubmit: (data: SellFormData & { profit: number; avg_cost_at_sell: number }) => Promise<void>;
  loading?: boolean;
}

export function SellModal({ symbol, totalShares, avgCost, onClose, onSubmit, loading }: SellModalProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SellFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      sell_date: new Date().toISOString().split('T')[0],
      shares: totalShares,
      sell_price: 0,
    },
  });

  const sellDate = watch('sell_date');
  const sellShares = watch('shares') || 0;
  const sellPrice = watch('sell_price') || 0;
  const profit = (sellPrice - avgCost) * sellShares;

  const handleFormSubmit = async (data: SellFormData) => {
    if (data.shares > totalShares) {
      alert(`คุณมีหุ้นเพียง ${formatNumber(totalShares)} หุ้น เท่านั้น`);
      return;
    }
    await onSubmit({
      ...data,
      avg_cost_at_sell: avgCost,
      profit,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <div className="modal-title mono">SELL STOCK — {symbol}</div>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '2px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Holding Context</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Available Shares:</span>
                <span className="mono">{formatNumber(totalShares, 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
                <span>Average Cost:</span>
                <span className="mono">{formatCurrency(avgCost)}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                วันที่ขาย (พ.ศ.) *
                {sellDate && (
                  <span style={{ color: 'var(--amber)', fontSize: '11px', fontWeight: 600, marginLeft: '6px' }}>
                    ({formatThaiDate(sellDate)})
                  </span>
                )}
              </label>
              <ThaiDateInput value={sellDate} onChange={(val) => setValue('sell_date', val)} required />
              {errors.sell_date && <div className="form-error">{errors.sell_date.message}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">จำนวนหุ้นที่ขาย</label>
              <input 
                type="number" 
                step="any" 
                className="form-input mono" 
                {...register('shares', { valueAsNumber: true })} 
              />
              {errors.shares && <div className="form-error">{errors.shares.message}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">ราคาขายต่อหุ้น (฿)</label>
              <input 
                type="number" 
                step="any" 
                className="form-input mono" 
                {...register('sell_price', { valueAsNumber: true })} 
              />
              {errors.sell_price && <div className="form-error">{errors.sell_price.message}</div>}
            </div>

            <div style={{ marginTop: '8px', padding: '12px', background: profit >= 0 ? 'rgba(39,174,96,0.08)' : 'rgba(224,58,58,0.08)', border: `1px solid ${profit >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'}`, borderRadius: '2px' }}>
              <div style={{ fontSize: '10px', color: profit >= 0 ? 'var(--green)' : 'var(--red)', textTransform: 'uppercase', marginBottom: '4px' }}>Estimated Realized Profit</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {formatCurrency(profit)}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'ยืนยันการขาย'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
