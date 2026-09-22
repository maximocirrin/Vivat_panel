import 'server-only';
import { financeClient } from './supabase';
import { accessConfigured } from './access';
import type { Period } from './period';
import type { Expense } from './finance-validation';
export async function getExpenses(period: Period): Promise<{ data: Expense[] | null; error: string | null }> {
  if (!accessConfigured()) return { data: null, error: 'Configurá el acceso privado del panel para habilitar gastos y comprobantes.' };
  try {
    const db = financeClient();
    if (!db) return { data: null, error: 'Pendiente de conectar la base financiera separada. Los gastos todavía no se pueden guardar.' };
    const all: Expense[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from('expenses').select('id,description,category,kind,amount_cents,incurred_on,receipt_path,receipt_name').gte('incurred_on', period.from).lte('incurred_on', period.to).order('incurred_on', { ascending: false }).order('id').range(offset, offset + 499).abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
      all.push(...data as Expense[]);
      if (data.length < 500) return { data: all, error: null };
      if (offset >= 100000) throw new Error('Dataset demasiado grande');
    }
  } catch {
    return { data: null, error: 'No se pudo leer la base financiera. Revisá la configuración y las tablas.' };
  }
}
