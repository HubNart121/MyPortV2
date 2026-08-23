'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ToastContainer, useToast } from '@/components/Toast';
import {
  fetchFiles,
  addFileRecord,
  updateFileRecord,
  deleteFileRecord,
  uploadBinaryFile,
  type FileRecordInput,
} from '@/lib/services/fileService';
import { isOfflineMode } from '@/lib/app-mode';

export default function FilesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const emptyForm: FileRecordInput = { name: '', detail: '', link: '', storage_kind: 'link' };
  const [formData, setFormData] = useState<FileRecordInput>(emptyForm);

  const { data: files, isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: fetchFiles,
  });

  const filteredFiles = files?.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.detail && f.detail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploadingFile(true);
    try {
      const uploaded = await uploadBinaryFile(selectedFile);
      setFormData((prev) => ({
        ...prev,
        name: prev.name || selectedFile.name,
        ...uploaded,
        link: uploaded.link || '',
      }));
      toast.show(isOfflineMode ? 'บันทึกไฟล์ลง Local Volume แล้ว' : 'อัปโหลดไฟล์ขึ้น Firebase Storage สำเร็จ!', 'success');
    } catch (err: any) {
      toast.show(err.message || 'อัปโหลดไฟล์ไม่สำเร็จ (สามารถใส่ URL เองได้)', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingId) {
        await updateFileRecord(editingId, formData);
        toast.show('อัปเดตไฟล์ข้อมูลสำเร็จ', 'success');
      } else {
        await addFileRecord(formData);
        toast.show('เพิ่มไฟล์สำเร็จ', 'success');
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['files'] });
    } catch (err: any) {
      toast.show(err.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันลบไฟล์นี้?')) return;
    try {
      await deleteFileRecord(id);
      toast.show('ลบไฟล์แล้ว', 'success');
      queryClient.invalidateQueries({ queryKey: ['files'] });
    } catch (err: any) {
      toast.show(err.message || 'ลบไม่สำเร็จ', 'error');
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
                       setFormData({
                         name: f.name,
                         detail: f.detail || '',
                         link: f.link || '',
                         storage_kind: f.storage_kind || 'link',
                         stored_name: f.stored_name || null,
                         original_name: f.original_name || null,
                         mime_type: f.mime_type || null,
                         size_bytes: f.size_bytes ?? null,
                       });
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

      </div>

      {isAdding && createPortal(
          <div className="modal-overlay">
            <div className="modal file-modal">
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
                  <div className="form-group" style={{ padding: '12px', background: 'var(--bg-surface)', border: '1px dashed var(--border-bright)', borderRadius: '4px' }}>
                    <label className="form-label" style={{ color: 'var(--amber)' }}>
                      {isOfflineMode ? '▣ เก็บไฟล์ใน Local Docker Volume (สูงสุด 20 MB)' : '☁ อัปโหลดไฟล์ตรงเข้า Firebase Storage'}
                    </label>
                    <input 
                      type="file" 
                      className="form-input" 
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                    {uploadingFile && <div style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '4px' }}>⏳ กำลังบันทึกไฟล์...</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">{isOfflineMode ? 'ลิงก์ภายนอก (ไม่บังคับ)' : 'ลิงก์/URL (Link)'}</label>
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
          </div>,
          document.body
      )}
      <ToastContainer />
    </>
  );
}
