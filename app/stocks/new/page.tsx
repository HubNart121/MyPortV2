'use client';

import { useRouter } from 'next/navigation';
import {
  createStock,
  fetchStockOptions,
  findDuplicateStock,
} from '@/lib/services/portfolioService';
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
        const options = await fetchStockOptions();
        setExistingPorts(options.ports);
        setExistingStatuses(options.statuses);
        setExistingAssetTypes(options.assetTypes);
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
      const normalizedSymbol = data.symbol.trim().toUpperCase();
      const normalizedPort = data.port_type.trim();
      const duplicate = await findDuplicateStock(normalizedSymbol, normalizedPort);
      if (duplicate) {
        throw new Error(`มีหุ้น ${normalizedSymbol} อยู่ใน Port ${normalizedPort} แล้ว`);
      }

      const inserted = await createStock({
          symbol: normalizedSymbol,
          name: data.name || null,
          sector: data.sector || null,
          status: 'Sold Off',
          asset_type: data.asset_type,
          port_type: normalizedPort,
          dividend_per_share: data.dividend_per_share,
          current_price: data.current_price,
          target_price: data.target_price,
          graph_url: data.graph_url?.trim() || null,
          link_url: data.link_url?.trim() || null,
          note: data.note || null,
        });
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
