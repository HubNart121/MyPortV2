import { getSupabase } from './supabase';

export async function debugAuthConfig() {
  const supabase = getSupabase();
  
  console.log('--- DEBUG START: AUTH_CONFIG ---');
  
  // 1. Check current data
  const { data: current, error: fetchError } = await supabase
    .from('auth_config')
    .select('*');
    
  if (fetchError) {
    console.error('Fetch Error:', fetchError);
  } else {
    console.log('Current Rows in auth_config:', current);
  }

  // 2. Test a small update (just update the time)
  if (current && current.length > 0) {
    const targetId = current[0].id;
    console.log(`Testing update on ID: ${targetId}`);
    
    const { data: updateResult, error: updateError } = await supabase
      .from('auth_config')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', targetId)
      .select();
      
    if (updateError) {
      console.error('Update Error Detail:', updateError);
    } else {
      console.log('Update Success:', updateResult);
    }
  } else {
    console.warn('No records found in auth_config to test.');
  }
  
  console.log('--- DEBUG END ---');
}
