'use server';

import { cookies } from 'next/headers';
import { getSupabase } from '../supabase';

const AUTH_COOKIE_NAME = 'port_track_auth';

export async function loginAction(user: string, pass: string) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('auth_config')
    .select('username, password')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return { success: false, error: 'Database connection failed' };
  }

  const isValid = data.username.trim() === user.trim() && data.password.trim() === pass.trim();

  if (isValid) {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return { success: true };
  }

  return { success: false, error: 'Invalid credentials' };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  return { success: true };
}

export async function checkAuthAction() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value === 'authenticated';
}
