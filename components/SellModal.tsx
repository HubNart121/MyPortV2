'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { calculatePositionTimeline, formatCurrency, formatNumber, formatThaiDate } from '@/lib/calculations';
import type { BuyRound, RealizedTrade } from '@/lib/types';
import { ThaiDateInput } from './ThaiDateInput';

const schema = z.object({
  sell_date: z.string().min(1, 'ระบุวันที่ขาย'),
  shares: z.number().min(0.0001, 'ต้องขายมากกว่า 0 หุ้น'),
  sell_price: z.number().min(0.0001, 'ระบุราคาขาย'),
  sell_fee: z.number().min(0, 'ค่าธรรมเนียมต้องไม่ติดลบ'),
});

export type SellFormData = z.infer<typeof schema>;

interface SellModalProps {
  symbol: string;
  totalShares: number;
  rounds: BuyRound[];
  sells: RealizedTrade[];
  initialData?: RealizedTrade;
  onClose: () => void;
  onSubmit: (data: SellFormData & { profit: number; avg_cost_at_sell: number }) => Promise<void>;
  loading?: boolean;
}

export function SellModal({ symbol, totalShares, rounds, sells, initialData, onClose, onSubmit, loading }: SellModalProps) {
  const { register, handleSubmit, watch, setValue, setFocus, formState: { errors } } = useForm<SellFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      sell_date: initialData?.sell_date ?? new Date().toISOString().split('T')[0],
      shares: initialData?.shares ?? totalShares,
      sell_price: initialData?.sell_price ?? 0,
      sell_fee: initialData?.sell_fee ?? 0,
    },
  });

  const sellDate = watch('sell_date');
  const sellShares = watch('shares') || 0;
  const sellPrice = watch('sell_price') || 0;
  const sellFee = watch('sell_fee') || 0;
  const sellsForCalculation = initialData
    ? sells.filter((trade) => trade.id !== initialData.id)
    : sells;
  const positionOnSellDate = calculatePositionTimeline(rounds, sellsForCalculation, sellDate);
  const availableShares = positionOnSellDate.activeShares;
  const avgCost = positionOnSellDate.avgCost;
  const profit = (sellPrice * sellShares) - sellFee - (avgCost * sellShares);
  const costBasis = avgCost * sellShares;
  const profitPct = costBasis > 0 ? (profit / costBasis) * 100 : 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => setFocus('sell_price'));
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [loading, onClose, setFocus]);

  const handleFormSubmit = async (data: SellFormData) => {
    if (data.shares > availableShares) {
      alert(`ณ วันที่เลือก คุณมีหุ้นเพียง ${formatNumber(availableShares)} หุ้น เท่านั้น`);
      return;
    }
    await onSubmit({
      ...data,
      avg_cost_at_sell: avgCost,
      profit,
    });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="modal-overlay">
      <div
        className="modal"
        style={{ maxWidth: '420px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sell-modal-title"
      >
        <div className="modal-header">
          <div id="sell-modal-title" className="modal-title mono">{initialData ? 'EDIT SALE' : 'SELL STOCK'} — {symbol}</div>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="ปิดหน้าต่างบันทึกการขาย">✕</button>
        </div>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '2px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Holding Context</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Available Shares on Sell Date:</span>
                <span className="mono">{formatNumber(availableShares, 0)}</span>
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

            <div className="form-group">
              <label className="form-label">ค่าธรรมเนียมขายรวม (฿)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input mono"
                {...register('sell_fee', { valueAsNumber: true })}
              />
              <div style={{ marginTop: '5px', color: 'var(--text-muted)', fontSize: '11px' }}>
                ระบบจะหักค่าธรรมเนียมออกจากยอดขายก่อนคำนวณกำไรสุทธิ
              </div>
              {errors.sell_fee && <div className="form-error">{errors.sell_fee.message}</div>}
            </div>

            <div style={{ marginTop: '8px', padding: '12px', background: profit >= 0 ? 'rgba(39,174,96,0.08)' : 'rgba(224,58,58,0.08)', border: `1px solid ${profit >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'}`, borderRadius: '2px' }}>
              <div style={{ fontSize: '10px', color: profit >= 0 ? 'var(--green)' : 'var(--red)', textTransform: 'uppercase', marginBottom: '4px' }}>Estimated Net Realized Profit</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {formatCurrency(profit)}
              </div>
              <div className="mono" style={{ marginTop: '4px', fontSize: '12px', fontWeight: 700, color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {profitPct > 0 ? '+' : ''}{formatNumber(profitPct)}%
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : initialData ? 'บันทึกการแก้ไข' : 'ยืนยันการขาย'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
