import 'server-only';

import { adminFirestore, firebaseUserForEmail } from './firebase-admin';

const ACTIVITY_LOG_RETENTION_DAYS = 30;

interface AdminActivityLogInput {
  action: 'create' | 'update' | 'delete' | 'import' | 'clear' | 'restore';
  category: 'stock' | 'buy_round' | 'sell' | 'dividend' | 'cash' | 'file' | 'information' | 'system';
  target_label: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}

function cutoffMs(): number {
  return Date.now() - ACTIVITY_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
}

export async function recordAdminActivityLogForEmail(
  email: string,
  input: AdminActivityLogInput,
): Promise<void> {
  try {
    const user = await firebaseUserForEmail(email);
    const db = adminFirestore();
    const logs = db.collection('users').doc(user.uid).collection('activity_logs');
    await logs.add({
      created_at: new Date().toISOString(),
      actor_email: email,
      action: input.action,
      category: input.category,
      target_label: input.target_label.slice(0, 500),
      summary: input.summary.slice(0, 1000),
      metadata: input.metadata ?? {},
    });

    const oldLogs = await logs.where('created_at', '<', new Date(cutoffMs()).toISOString()).get();
    await Promise.all(oldLogs.docs.map((item) => item.ref.delete()));
  } catch (error) {
    console.warn('Admin activity log write failed:', error);
  }
}
