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
import { auth, db, isFirebaseConfigured } from '../firebase';
import { getSupabase } from '../supabase';
import type { InfoResource } from '../types';
import { recordActivityLog } from './activityLogService';

const COLLECTION_NAME = 'informations';

function firebaseUserId(): string {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('กรุณาเข้าสู่ระบบ Firebase ก่อนใช้งานข้อมูล');
  return uid;
}

function informationsCollection() {
  if (!db) throw new Error('Firebase Firestore ยังไม่ได้ตั้งค่า');
  return collection(db, 'users', firebaseUserId(), COLLECTION_NAME);
}

export async function fetchInformations(): Promise<InfoResource[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(informationsCollection(), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: InfoResource[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          title: data.title || '',
          detail: data.detail || '',
          link: data.link || '',
          created_at: data.created_at || new Date().toISOString(),
        });
      });
      return list;
    } catch (e) {
      console.warn('Firestore fetch failed:', e);
      throw e;
    }
  }

  // Fallback to Supabase / PostgreSQL
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('informations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InfoResource[];
}

export async function addInformation(item: { title: string; detail?: string; link?: string }): Promise<void> {
  const payload = {
    ...item,
    created_at: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      const ref = await addDoc(informationsCollection(), payload);
      await recordActivityLog({
        action: 'create',
        category: 'information',
        target_label: item.title,
        summary: `เพิ่มคลังความรู้ ${item.title}`,
        metadata: { target_id: ref.id, source: 'informations' },
      });
      return;
    } catch (e) {
      console.warn('Firestore add failed:', e);
      throw e;
    }
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('informations').insert([payload]).select('id').single();
  if (error) throw error;
  await recordActivityLog({
    action: 'create',
    category: 'information',
    target_label: item.title,
    summary: `เพิ่มคลังความรู้ ${item.title}`,
    metadata: { target_id: data?.id ?? null, source: 'informations' },
  });
}

export async function updateInformation(id: string, item: { title: string; detail?: string; link?: string }): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(informationsCollection(), id);
      await updateDoc(docRef, item);
      await recordActivityLog({
        action: 'update',
        category: 'information',
        target_label: item.title,
        summary: `แก้ไขคลังความรู้ ${item.title}`,
        metadata: { target_id: id, source: 'informations' },
      });
      return;
    } catch (e) {
      console.warn('Firestore update error (might be local DB id):', e);
      throw e;
    }
  }

  const supabase = getSupabase();
  const { error } = await supabase.from('informations').update(item).eq('id', id);
  if (error && !isFirebaseConfigured) throw error;
  await recordActivityLog({
    action: 'update',
    category: 'information',
    target_label: item.title,
    summary: `แก้ไขคลังความรู้ ${item.title}`,
    metadata: { target_id: id, source: 'informations' },
  });
}

export async function deleteInformation(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(informationsCollection(), id);
      await deleteDoc(docRef);
      await recordActivityLog({
        action: 'delete',
        category: 'information',
        target_label: id,
        summary: 'ลบคลังความรู้',
        metadata: { target_id: id, source: 'informations' },
      });
      return;
    } catch (e) {
      console.warn('Firestore delete error (might be local DB id):', e);
      throw e;
    }
  }

  const supabase = getSupabase();
  const { error } = await supabase.from('informations').delete().eq('id', id);
  if (error && !isFirebaseConfigured) throw error;
  await recordActivityLog({
    action: 'delete',
    category: 'information',
    target_label: id,
    summary: 'ลบคลังความรู้',
    metadata: { target_id: id, source: 'informations' },
  });
}
