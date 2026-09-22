import { validDate } from './period';
export const kinds = ['fijo', 'variable', 'varios'] as const;
export type Expense = { id: string; description: string; category: string; kind: typeof kinds[number]; amount_cents: number; incurred_on: string; receipt_path: string | null; receipt_name: string | null };
export function parseExpense(form: FormData) {
  const description = String(form.get('description') || '').trim();
  const category = String(form.get('category') || '').trim();
  const kind = String(form.get('kind') || '');
  const date = String(form.get('incurred_on') || '');
  const raw = String(form.get('amount') || '').replace(',', '.');
  if (!description || description.length > 160 || !category || category.length > 80 || !kinds.includes(kind as typeof kinds[number]) || !validDate(date)) throw new Error('Completá concepto, categoría, tipo y una fecha válida.');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(raw)) throw new Error('El importe debe tener como máximo dos decimales.');
  const cents = Math.round(Number(raw) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000000) throw new Error('El importe debe ser mayor a cero y menor o igual a mil millones de pesos.');
  return { description, category, kind: kind as typeof kinds[number], incurred_on: date, amount_cents: cents };
}
export function receiptType(bytes: Uint8Array) {
  if (Buffer.from(bytes.subarray(0, 5)).toString() === '%PDF-') return { extension: 'pdf', mime: 'application/pdf' };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { extension: 'jpg', mime: 'image/jpeg' };
  if (Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { extension: 'png', mime: 'image/png' };
  return null;
}
export function financeTotals(gross: number | null, expenses: Expense[] | null) {
  const total = expenses === null ? null : expenses.reduce((sum, e) => sum + Number(e.amount_cents), 0);
  return { total, net: gross === null || total === null ? null : gross - total };
}
