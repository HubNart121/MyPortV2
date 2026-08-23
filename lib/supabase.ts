import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Separate instances for server and client to avoid URL conflicts
let clientInstance: SupabaseClient | null = null;
let serverInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  const isServer = typeof window === 'undefined';

  // Return cached instance if available
  if (isServer && serverInstance) return serverInstance;
  if (!isServer && clientInstance) return clientInstance;

  // Next.js standard environment variables
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // If executing on the server side (inside Docker), route queries to the api gateway directly
  if (isServer) {
    // The 'gateway' container is the Nginx proxy that rewrites /rest/v1/ for PostgREST
    url = process.env.SUPABASE_SERVER_URL || 'http://gateway:8080';
  }

  if (!url || !key) {
    if (!isServer) {
      console.warn('Supabase URL or Key is missing from environment variables.');
    }
  }

  const instance = createClient(url, key, {
    auth: { persistSession: !isServer },
  });

  if (isServer) {
    serverInstance = instance;
  } else {
    clientInstance = instance;
  }

  return instance;
};
