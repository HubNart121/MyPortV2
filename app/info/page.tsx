'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';
import { ToastContainer, useToast } from '@/components/Toast';
import type { InfoResource } from '@/lib/types';

async function fetchInfo() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('informations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as InfoResource[];
}

export default function InfoPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({ title: '', link: '', detail: '' });

  const { data: infoList, isLoading } = useQuery({
    queryKey: ['informations'],
    queryFn: fetchInfo,
  });

  const filteredInfo = infoList?.filter(info => 
    info.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (info.detail && info.detail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = getSupabase();
    
    try {
      if (editingId) {
        const { error } = await supabase.from('informations').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.show('อัปเดตข้อมูลสำเร็จ', 'success');
      } else {
        const { error } = await supabase.from('informations').insert([formData]);
        if (error) throw error;
        toast.show('เพิ่มข้อมูลใหม่สำเร็จ', 'success');
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ title: '', link: '', detail: '' });
      queryClient.invalidateQueries({ queryKey: ['informations'] });
    } catch (err: any) {
      toast.show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันลบข้อมูลนี้?')) return;
    const supabase = getSupabase();
    const { error } = await supabase.from('informations').delete().eq('id', id);
    if (error) toast.show(error.message, 'error');
    else {
      toast.show('ลบข้อมูลแล้ว', 'success');
      queryClient.invalidateQueries({ queryKey: ['informations'] });
    }
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <div className="page-title">คลังความรู้ (INFORMATION)</div>
            <div className="page-subtitle">รวบรวมเทคนิค ความรู้ และข้อมูลประกอบการตัดสินใจ</div>
          </div>
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>+ เพิ่มข้อมูลใหม่</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="🔍 ค้นหาหัวข้อ หรือเนื้อหา..." 
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }} className="mono">LOADING...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredInfo?.map((info) => (
              <div key={info.id} className="stock-row" style={{ gridTemplateColumns: 'min-content 1fr min-content', gap: '20px', alignItems: 'flex-start', cursor: 'default' }}>
                <div style={{ padding: '10px 0' }}>
                   <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(39,174,96,0.1)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>ℹ</div>
                </div>
                <div style={{ padding: '4px 0', flex: 1 }}>
                  <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{info.title}</div>
                  {info.detail && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px 0', whiteSpace: 'pre-wrap' }}>{info.detail}</p>}
                  {info.link && (
                    <a 
                      href={info.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ fontSize: '12px', color: 'var(--blue)', textDecoration: 'underline' }}
                      className="mono"
                    >
                      🔗 {info.link}
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', padding: '10px 0' }}>
                   <button className="btn btn-ghost btn-sm" onClick={() => {
                      setEditingId(info.id);
                      setFormData({ title: info.title, link: info.link || '', detail: info.detail || '' });
                      setIsAdding(true);
                   }}>✎</button>
                   <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(info.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isAdding && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div className="modal-title mono">{editingId ? 'EDIT INFO' : 'ADD NEW INFO'}</div>
                <button className="btn btn-ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">หัวข้อความรู้ (Inf Title)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ลิงก์ข้อมูล (Link)</label>
                    <input 
                      type="url" 
                      className="form-input mono" 
                      placeholder="https://..."
                      value={formData.link}
                      onChange={e => setFormData({ ...formData, link: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">เนื้อหา/รายละเอียด (Detail)</label>
                    <textarea 
                      className="form-input" 
                      rows={6}
                      value={formData.detail}
                      onChange={e => setFormData({ ...formData, detail: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setIsAdding(false); setEditingId(null); }}>ยกเลิก</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : editingId ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}
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
