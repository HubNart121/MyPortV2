'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';
import { ToastContainer, useToast } from '@/components/Toast';
import type { FileResource } from '@/lib/types';

async function fetchFiles() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as FileResource[];
}

export default function FilesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({ name: '', detail: '', link: '' });

  const { data: files, isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: fetchFiles,
  });

  const filteredFiles = files?.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.detail && f.detail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = getSupabase();
    
    try {
      if (editingId) {
        const { error } = await supabase.from('files').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.show('อัปโหลดไฟล์/ข้อมูลสำเร็จ', 'success');
      } else {
        const { error } = await supabase.from('files').insert([formData]);
        if (error) throw error;
        toast.show('เพิ่มไฟล์สำเร็จ', 'success');
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', detail: '', link: '' });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    } catch (err: any) {
      toast.show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันลบไฟล์นี้?')) return;
    const supabase = getSupabase();
    const { error } = await supabase.from('files').delete().eq('id', id);
    if (error) toast.show(error.message, 'error');
    else {
      toast.show('ลบไฟล์แล้ว', 'success');
      queryClient.invalidateQueries({ queryKey: ['files'] });
    }
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <div className="page-title">จัดการไฟล์ (FILES)</div>
            <div className="page-subtitle">เก็บรวบรวมไฟล์และลิงก์ที่เกี่ยวข้องกับพอร์ต</div>
          </div>
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>+ เพิ่มไฟล์ใหม่</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="🔍 ค้นหาชื่อไฟล์ หรือรายละเอียด..." 
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }} className="mono">LOADING...</div>
        ) : (
          <div className="stock-badges-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
            {filteredFiles?.map((f) => (
              <div key={f.id} className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header" style={{ justifyContent: 'space-between' }}>
                  <div className="panel-title mono" style={{ color: 'var(--amber)' }}>{f.name}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                       setEditingId(f.id);
                       setFormData({ name: f.name, detail: f.detail || '', link: f.link || '' });
                       setIsAdding(true);
                    }}>✎</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(f.id)}>✕</button>
                  </div>
                </div>
                <div className="panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {f.detail && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{f.detail}</p>}
                  {f.link && (
                    <a 
                      href={f.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 'auto', textAlign: 'center', display: 'block' }}
                    >
                      🔗 เปิดลิงก์ไฟล์
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isAdding && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div className="modal-title mono">{editingId ? 'EDIT FILE' : 'ADD NEW FILE'}</div>
                <button className="btn btn-ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">ชื่อไฟล์ (File Name)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">รายละเอียด (Detail)</label>
                    <textarea 
                      className="form-input" 
                      rows={3}
                      value={formData.detail}
                      onChange={e => setFormData({ ...formData, detail: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ลิงก์/URL (Link)</label>
                    <input 
                      type="url" 
                      className="form-input mono" 
                      placeholder="https://..."
                      value={formData.link}
                      onChange={e => setFormData({ ...formData, link: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setIsAdding(false); setEditingId(null); }}>ยกเลิก</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : editingId ? 'อัปเดตข้อมูล' : 'บันทึกไฟล์'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </>
  );
}
