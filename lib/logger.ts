'use server';

import { headers } from 'next/headers';
import { getSupabase } from './supabase';

export async function logLoginAttempt(username: string, status: 'Success' | 'Failed') {
  try {
    const headerList = await headers();
    const userAgent = headerList.get('user-agent') || 'Unknown';
    const forwarded = headerList.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'Unknown';

    // Basic User-Agent parsing for device type
    let deviceType = 'Desktop';
    if (/mobile/i.test(userAgent)) deviceType = 'Mobile';
    else if (/tablet/i.test(userAgent)) deviceType = 'Tablet';

    // Simple OS detection
    let deviceName = 'Unknown Device';
    if (userAgent.includes('Windows')) deviceName = 'Windows PC';
    else if (userAgent.includes('Macintosh')) deviceName = 'Mac';
    else if (userAgent.includes('iPhone')) deviceName = 'iPhone';
    else if (userAgent.includes('Android')) deviceName = 'Android Device';
    else if (userAgent.includes('Linux')) deviceName = 'Linux';

    const supabase = getSupabase();
    const { error } = await supabase
      .from('login_logs')
      .insert({
        username,
        ip_address: ip,
        device: deviceName,
        device_type: deviceType,
        status
      });

    if (error) {
      console.error('Failed to log login attempt:', error);
    }
    
    return !error;
  } catch (err) {
    console.error('Error logging login attempt:', err);
    return false;
  }
}

export async function getLoginLogs() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('login_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) throw error;
  return data;
}
