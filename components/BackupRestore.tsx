'use client';

import { useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { BackupData } from '@/lib/types';

interface BackupRestoreProps {
  onRestoreComplete: () => void;
}

export function BackupRestore({ onRestoreComplete }: BackupRestoreProps) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const supabase = getSupabase();
      
      // Fetch Stocks
      const { data: stocks, error: sErr } = await supabase
        .from('stocks')
        .select('*, buy_rounds(*), realized_trades(*), dividend_payments(*)');
      if (sErr) throw sErr;

      // Fetch Files
      const { data: files, error: fErr } = await supabase.from('files').select('*');
      if (fErr) throw fErr;

      // Fetch Informations
      const { data: infos, error: iErr } = await supabase.from('informations').select('*');
      if (iErr) throw iErr;

      const backup: BackupData = {
        version: '1.3', // Updated version for dividend_payments
        exported_at: new Date().toISOString(),
        stocks: (stocks as any) ?? [],
        files: files ?? [],
        informations: infos ?? [],
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `port-track-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as BackupData;
        if (!data.version || !Array.isArray(data.stocks)) {
          throw new Error('ไฟล์ไม่ถูกต้อง: รูปแบบข้อมูลผิดพลาด');
        }
        setImportPreview(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'ไม่สามารถอ่านไฟล์ได้');
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview) return;
    if (!confirm(`นำเข้าข้อมูล?\n\nหมายเหตุ: ข้อมูลเดิมที่มี ID เดียวกันจะถูก Overwrite`)) return;

    setImporting(true);
    setError(null);
    try {
      const supabase = getSupabase();

      // Restore Stocks & Related
      for (const stock of importPreview.stocks) {
        const { buy_rounds, realized_trades, dividend_payments, ...stockData } = stock;
        
        // ลบข้อมูลเดิมที่ ID หรือ Symbol ตรงกันออกก่อน เพื่อป้องกัน constraint error และ foreign key conflict
        if (stockData.id) {
          await supabase.from('stocks').delete().eq('id', stockData.id);
        }
        if (stockData.symbol) {
          await supabase.from('stocks').delete().eq('symbol', stockData.symbol);
        }

        const { error: sErr } = await supabase.from('stocks').insert(stockData);
        if (sErr) throw sErr;

        if (buy_rounds && buy_rounds.length > 0) {
          const { error: rErr } = await supabase.from('buy_rounds').insert(buy_rounds);
          if (rErr) throw rErr;
        }

        if (realized_trades && realized_trades.length > 0) {
          const { error: rtErr } = await supabase.from('realized_trades').insert(realized_trades);
          if (rtErr) throw rtErr;
        }

        if (dividend_payments && dividend_payments.length > 0) {
          const { error: dErr } = await supabase.from('dividend_payments').insert(dividend_payments);
          if (dErr) throw dErr;
        }
      }

      // Restore Files
      if (importPreview.files && importPreview.files.length > 0) {
        const { error: fErr } = await supabase.from('files').upsert(importPreview.files);
        if (fErr) throw fErr;
      }

      // Restore Informations
       if (importPreview.informations && importPreview.informations.length > 0) {
        const { error: iErr } = await supabase.from('informations').upsert(importPreview.informations);
        if (iErr) throw iErr;
      }

      setImportPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      onRestoreComplete();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message 
        : (e && typeof e === 'object' && 'message' in e) ? String((e as any).message)
        : JSON.stringify(e) || 'Import failed';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Export */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">⊡ Export Backup</div>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            ดาวน์โหลดข้อมูลหุ้นและรอบการซื้อทั้งหมดเป็นไฟล์ JSON สำหรับ Backup
          </p>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'กำลัง Export...' : '⊡ Download Backup JSON'}
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">⊞ Import / Restore</div>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            นำเข้าข้อมูลจากไฟล์ Backup JSON ที่ Export ไว้ก่อนหน้า
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              📂 เลือกไฟล์ Backup
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </label>

            {importPreview && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                พบ{' '}
                <span className="mono" style={{ color: 'var(--amber)' }}>
                  {importPreview.stocks.length}
                </span>{' '}
                หุ้น · exported{' '}
                <span className="mono">{importPreview.exported_at.slice(0, 10)}</span>
              </div>
            )}
          </div>

          {importPreview && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '2px', padding: '12px', marginBottom: '16px', maxHeight: '160px', overflowY: 'auto' }}>
                {importPreview.stocks.map((s) => (
                  <div key={s.id} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', gap: '12px' }}>
                    <span className="mono" style={{ color: 'var(--amber)', width: '80px' }}>{s.symbol}</span>
                    <span>{s.name || '—'}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{s.buy_rounds?.length ?? 0} rounds</span>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? 'กำลัง Import...' : '⊞ นำเข้าข้อมูล'}
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(224,58,58,0.08)', border: '1px solid rgba(224,58,58,0.3)', borderRadius: '2px', fontSize: '12px', color: 'var(--red)' }}>
              ⚠ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
