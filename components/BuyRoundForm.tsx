'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BuyRound } from '@/lib/types';

import { formatThaiDate } from '@/lib/calculations';

import { ThaiDateInput } from './ThaiDateInput';

const toNum = (v: unknown) => (v === '' || v === undefined || v === null ? 0 : Number(v));

const schema = z.object({
  buy_date: z.string().min(1, 'Required'),
  price: z.coerce.number().min(0.0001, 'Must be > 0'),
  shares: z.coerce.number().min(1, 'Must be > 0'),
  buy_fee: z.coerce.number().min(0, 'ค่าธรรมเนียมต้องไม่ติดลบ'),
  note: z.string().trim().max(2000, 'Note must be 2,000 characters or less').optional(),
  link_url: z.string().trim().max(2000, 'URL must be 2,000 characters or less').optional(),
});

export type BuyRoundFormData = z.output<typeof schema>;
type BuyRoundFormInput = z.input<typeof schema>;

interface BuyRoundFormProps {
  initialData?: Partial<BuyRound>;
  onSubmit: (data: BuyRoundFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function BuyRoundForm({ initialData, onSubmit, onCancel, loading }: BuyRoundFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BuyRoundFormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      buy_date: initialData?.buy_date || new Date().toISOString().slice(0, 10),
      price: initialData?.price || 0,
      shares: initialData?.shares || 0,
      buy_fee: initialData?.buy_fee || 0,
      note: initialData?.note || '',
      link_url: initialData?.link_url || '',
    },
  });

  const selectedDate = watch('buy_date');

  const onFormSubmit = (data: BuyRoundFormInput) => {
    onSubmit(data as BuyRoundFormData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <div style={{ display: 'grid', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">
            วันที่ซื้อ (พ.ศ.) *
            {selectedDate && (
              <span style={{ color: 'var(--amber)', fontSize: '11px', fontWeight: 600, marginLeft: '6px' }}>
                ({formatThaiDate(selectedDate)})
              </span>
            )}
          </label>
          <ThaiDateInput value={selectedDate} onChange={(val) => setValue('buy_date', val)} required />
          {errors.buy_date && <span className="form-error">{errors.buy_date.message}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">ราคาที่ซื้อ (฿) *</label>
            <input type="number" step="0.0001" className="form-input mono" placeholder="0.00" {...register('price')} />
            {errors.price && <span className="form-error">{errors.price.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">จำนวนหุ้น *</label>
            <input type="number" step="1" className="form-input mono" placeholder="0" {...register('shares')} />
            {errors.shares && <span className="form-error">{errors.shares.message}</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">ค่าธรรมเนียมซื้อรวม (฿)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-input mono"
            placeholder="0.00"
            {...register('buy_fee')}
          />
          <div style={{ marginTop: '5px', color: 'var(--text-muted)', fontSize: '11px' }}>
            กรอกยอดค่าคอมมิชชันและภาษีรวมของรายการนี้ ระบบจะบวกเข้าต้นทุน
          </div>
          {errors.buy_fee && <span className="form-error">{errors.buy_fee.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Note</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="เช่น เหตุผลที่ซื้อ แผนการลงทุน หรือข้อมูลสำคัญ"
            {...register('note')}
          />
          {errors.note && <span className="form-error">{errors.note.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Link URL</label>
          <input
            type="url"
            className="form-input mono"
            placeholder="https://..."
            {...register('link_url')}
          />
          {errors.link_url && <span className="form-error">{errors.link_url.message}</span>}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button type="button" onClick={onCancel} className="btn btn-secondary">ยกเลิก</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : '✓ บันทึกรอบซื้อ'}
          </button>
        </div>
      </div>
    </form>
  );
}
