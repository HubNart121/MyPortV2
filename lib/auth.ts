import { getSupabase } from './supabase';

const AUTH_KEY = 'port_track_auth_session';

export async function verifyCredentials(user: string, pass: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('auth_config')
    .select('username, password')
    .eq('id', 1)
    .single();

  if (error || !data) return false;

  const isValid = data.username.trim() === user.trim() && data.password.trim() === pass.trim();
  
  if (isValid) {
    // Save to localStorage for legacy components
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_KEY, 'true');
    }
  }
  
  return isValid;
}

export function isLoggedIn() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_KEY);
    // Let the caller handle redirection or call server action
  }
}

export async function updateCredentials(user: string, pass: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('auth_config')
    .upsert({ 
      id: 1,
      username: user.trim(), 
      password: pass.trim(),
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error('Update Credentials Error:', error);
    return false;
  }

  return data && data.length > 0;
}
