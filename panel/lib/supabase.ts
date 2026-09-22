import 'server-only';
import { createClient } from '@supabase/supabase-js';
const options = { auth: { persistSession: false, autoRefreshToken: false } };
export function metricsClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, options) : null;
}
export function financeClient() {
  const url = process.env.FINANCE_SUPABASE_URL;
  const key = process.env.FINANCE_SUPABASE_SECRET_KEY || process.env.FINANCE_SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !key) return null;
  if (appUrl && new URL(url).hostname === new URL(appUrl).hostname) throw new Error('La base financiera debe ser distinta de la base de Vivat.');
  return createClient(url, key, options);
}
