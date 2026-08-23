import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, isFirebaseConfigured } from '../firebase';
import { getSupabase } from '../supabase';
import type { FileResource } from '../types';
import { recordActivityLog } from './activityLogService';

const COLLECTION_NAME = 'files';

function firebaseUserId(): string {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('กรุณาเข้าสู่ระบบ Firebase ก่อนใช้งานไฟล์');
  return uid;
}

function filesCollection() {
  if (!db) throw new Error('Firebase Firestore ยังไม่ได้ตั้งค่า');
  return collection(db, 'users', firebaseUserId(), COLLECTION_NAME);
}

export async function uploadBinaryToFirebaseStorage(file: File): Promise<string> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Firebase Storage ยังไม่ได้ตั้งค่าใน environment variables');
  }
  const timeStamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storageRef = ref(storage, `users/${firebaseUserId()}/files/${timeStamp}_${safeName}`);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

export type FileRecordInput = {
  name: string;
  detail?: string;
  link?: string;
  storage_kind?: 'link' | 'local';
  stored_name?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
};

export type UploadedFileMetadata = Pick<
  FileResource,
  'storage_kind' | 'stored_name' | 'original_name' | 'mime_type' | 'size_bytes'
>;

export async function uploadBinaryFile(file: File): Promise<UploadedFileMetadata & { link?: string }> {
  if (file.size > 20 * 1024 * 1024) throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 20 MB');
  if (isFirebaseConfigured) {
    return {
      link: await uploadBinaryToFirebaseStorage(file),
      storage_kind: 'link',
      stored_name: null,
      original_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
    };
  }

  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/local-files', { method: 'POST', body: formData });
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(result?.error?.message || 'อัปโหลดไฟล์ Local ไม่สำเร็จ');
  }
  return await response.json() as UploadedFileMetadata;
}

export async function fetchFiles(): Promise<FileResource[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(filesCollection(), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: FileResource[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || '',
          detail: data.detail || '',
          link: data.link || '',
          created_at: data.created_at || new Date().toISOString(),
          storage_kind: data.storage_kind || 'link',
          stored_name: data.stored_name || null,
          original_name: data.original_name || null,
          mime_type: data.mime_type || null,
          size_bytes: data.size_bytes ?? null,
        });
      });
      return list;
    } catch (e) {
      console.warn('Firestore fetch files failed:', e);
      throw e;
    }
  }

  // Fallback to Supabase / PostgreSQL
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FileResource[];
}

export async function addFileRecord(item: FileRecordInput): Promise<FileResource> {
  const payload = {
    ...item,
    created_at: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      const ref = await addDoc(filesCollection(), payload);
      await recordActivityLog({
        action: 'create',
        category: 'file',
        target_label: item.name,
        summary: `เพิ่มไฟล์ ${item.name}`,
        metadata: { target_id: ref.id, storage_kind: item.storage_kind ?? 'link', source: 'files' },
      });
      return { ...payload, id: ref.id } as FileResource;
    } catch (e) {
      console.warn('Firestore add file record failed:', e);
      throw e;
    }
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('files').insert([payload]).select('*').single();
  if (error) throw error;
  let created = data as FileResource;
  if (created.storage_kind === 'local' && created.stored_name) {
    const link = `/api/local-files/${created.id}`;
    const { data: updated, error: linkError } = await supabase
      .from('files')
      .update({ link })
      .eq('id', created.id)
      .select('*')
      .single();
    if (linkError) throw linkError;
    created = updated as FileResource;
  }
  await recordActivityLog({
    action: 'create',
    category: 'file',
    target_label: created.name,
    summary: `เพิ่มไฟล์ ${created.name}`,
    metadata: { target_id: created.id, storage_kind: created.storage_kind ?? 'link', source: 'files' },
  });
  return created;
}

export async function updateFileRecord(id: string, item: FileRecordInput): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(filesCollection(), id);
      await updateDoc(docRef, item);
      await recordActivityLog({
        action: 'update',
        category: 'file',
        target_label: item.name,
        summary: `แก้ไขไฟล์ ${item.name}`,
        metadata: { target_id: id, storage_kind: item.storage_kind ?? 'link', source: 'files' },
      });
      return;
    } catch (e) {
      console.warn('Firestore update file error:', e);
      throw e;
    }
  }

  const supabase = getSupabase();
  const { data: previous, error: readError } = await supabase.from('files').select('*').eq('id', id).single();
  if (readError) throw readError;
  const payload = item.storage_kind === 'local' ? { ...item, link: `/api/local-files/${id}` } : item;
  const { error } = await supabase.from('files').update(payload).eq('id', id);
  if (error && !isFirebaseConfigured) throw error;
  const oldStoredName = (previous as FileResource).stored_name;
  if (oldStoredName && oldStoredName !== item.stored_name) {
    await fetch(`/api/local-files/${oldStoredName}?binaryOnly=1`, { method: 'DELETE' });
  }
  await recordActivityLog({
    action: 'update',
    category: 'file',
    target_label: item.name,
    summary: `แก้ไขไฟล์ ${item.name}`,
    metadata: { target_id: id, storage_kind: item.storage_kind ?? 'link', source: 'files' },
  });
}

export async function deleteFileRecord(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(filesCollection(), id);
      await deleteDoc(docRef);
      await recordActivityLog({
        action: 'delete',
        category: 'file',
        target_label: id,
        summary: 'ลบไฟล์',
        metadata: { target_id: id, source: 'files' },
      });
      return;
    } catch (e) {
      console.warn('Firestore delete file error:', e);
      throw e;
    }
  }

  const response = await fetch(`/api/local-files/${id}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    const result = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(result?.error?.message || 'ลบไฟล์ Local ไม่สำเร็จ');
  }
  await recordActivityLog({
    action: 'delete',
    category: 'file',
    target_label: id,
    summary: 'ลบไฟล์',
    metadata: { target_id: id, source: 'files' },
  });
}
