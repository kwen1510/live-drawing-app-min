import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm';

let client = null;
let initialized = false;

export function getSupabaseClient(){
  if(client) return client;
  if(initialized) return null;
  initialized = true;
  const url = typeof window !== 'undefined' ? window?.SUPABASE_URL : null;
  const key = typeof window !== 'undefined' ? window?.SUPABASE_ANON_KEY : null;
  if(!url || !key){
    console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY configuration.');
    return null;
  }
  try{
    client = createClient(url, key, {
      auth: { persistSession: false },
      global: {
        headers: {
          'x-application-name': 'live-drawing-app-min',
        },
      },
    });
  }catch(err){
    console.error('[supabase] Failed to create client', err);
    client = null;
  }
  return client;
}

export function resetSupabaseClient(){
  client = null;
  initialized = false;
}
