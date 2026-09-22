import { authorized } from '@/lib/access';
import { financeClient } from '@/lib/supabase';
import { parseExpense, receiptType } from '@/lib/finance-validation';
export async function POST(request: Request) {
  if (!authorized(request.headers.get('authorization'))) return Response.json({ error: 'Acceso no autorizado.' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Origen inválido.' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > 6 * 1024 * 1024) return Response.json({ error: 'El comprobante supera los 5 MB.' }, { status: 413 });
  let db;
  try { db = financeClient(); } catch { return Response.json({ error: 'La base financiera debe ser independiente.' }, { status: 503 }); }
  if (!db) return Response.json({ error: 'Falta conectar la base financiera.' }, { status: 503 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: 'Formulario inválido.' }, { status: 400 }); }
  let expense;
  try { expense = parseExpense(form); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
  const id = String(form.get('id') || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: 'Identificador inválido.' }, { status: 400 });
  const existing = await db.from('expenses').select('id').eq('id', id).maybeSingle();
  if (existing.error) return Response.json({ error: 'No se pudo verificar el gasto.' }, { status: 503 });
  if (existing.data) return Response.json({ ok: true });
  const file = form.get('receipt');
  if (!(file instanceof File) || !file.size) return Response.json({ error: 'Adjuntá el comprobante del gasto.' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: 'El comprobante supera los 5 MB.' }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = receiptType(bytes);
  if (!type) return Response.json({ error: 'Usá un comprobante PDF, JPG o PNG válido.' }, { status: 400 });
  const receiptPath = id + '/' + crypto.randomUUID() + '.' + type.extension;
  const upload = await db.storage.from('expense-receipts').upload(receiptPath, bytes, { contentType: type.mime, upsert: false });
  if (upload.error) return Response.json({ error: 'No se pudo guardar el comprobante. El gasto no fue registrado.' }, { status: 503 });
  const inserted = await db.from('expenses').insert({ ...expense, id, currency: 'ARS', receipt_path: receiptPath, receipt_name: file.name.slice(0, 200), created_by: process.env.PANEL_USERNAME });
  if (inserted.error) {
    // Verify uncertain insert outcomes before removing an attachment.
    const check = await db.from('expenses').select('receipt_path').eq('id', id).maybeSingle();
    if (!check.error && check.data?.receipt_path === receiptPath) return Response.json({ ok: true });
    if (!check.error) await db.storage.from('expense-receipts').remove([receiptPath]);
    if (!check.error && check.data) return Response.json({ ok: true });
    return Response.json({ error: 'No se pudo confirmar el registro. Reintentá sin cerrar el formulario.' }, { status: 503 });
  }
  return Response.json({ ok: true }, { status: 201 });
}
