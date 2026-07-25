'use client';

import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { StockForm } from '@/components/StockForm';
import type { StockFormData } from '@/components/StockForm';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function NewStockPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingPorts, setExistingPorts] = useState<string[]>([]);
  const [existingStatuses, setExistingStatuses] = useState<string[]>([]);
  const [existingAssetTypes, setExistingAssetTypes] = useState<string[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.from('stocks').select('port_type, status, asset_type');
        if (data) {
          setExistingPorts(Array.from(new Set(data.map((s: any) => s.port_type).filter(Boolean))));
          setExistingStatuses(Array.from(new Set(data.map((s: any) => s.status).filter(Boolean))));
          setExistingAssetTypes(Array.from(new Set(data.map((s: any) => s.asset_type).filter(Boolean))));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchOptions();
  }, []);

  const onSubmit = async (data: StockFormData) => {
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: inserted, error: err } = await supabase
        .from('stocks')
        .insert({
          symbol: data.symbol.toUpperCase(),
          name: data.name || null,
          sector: data.sector || null,
          status: data.status,
          asset_type: data.asset_type,
          port_type: data.port_type,
          dividend_per_share: data.dividend_per_share,
          target_price: data.target_price,
          note: data.note || null,
        })
        .select()
        .single();

      if (err) throw err;
      router.push(`/stocks/${inserted.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">ADD STOCK</div>
          <div className="page-subtitle">เพิ่มหุ้นใหม่เข้าพอร์ต</div>
        </div>
        <Link href="/" className="btn btn-secondary">← กลับ</Link>
      </div>

      <div className="panel" style={{ maxWidth: '640px' }}>
        <div className="panel-header">
          <div className="panel-title">ข้อมูลหุ้น</div>
        </div>
        <div className="panel-body">
          <StockForm
            onSubmit={onSubmit}
            onCancel={() => router.push('/')}
            loading={saving}
            submitLabel="บันทึกหุ้น"
            existingPortTypes={existingPorts}
            existingStatuses={existingStatuses}
            existingAssetTypes={existingAssetTypes}
          />
          {error && (
            <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(224,58,58,0.08)', border: '1px solid rgba(224,58,58,0.3)', borderRadius: '2px', fontSize: '12px', color: 'var(--red)' }}>
              ⚠ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
