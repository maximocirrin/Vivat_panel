import { authorized } from '@/lib/access';
import { financeClient } from '@/lib/supabase';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(request.headers.get('authorization'))) return new Response('No autorizado', { status: 401 });
  try {
    const db = financeClient();
    if (!db) return new Response('Finanzas no configuradas', { status: 503 });
    const { id } = await params;
    const { data, error } = await db.from('expenses').select('receipt_path').eq('id', id).single();
    if (error || !data?.receipt_path) return new Response('Comprobante no encontrado', { status: 404 });
    const signed = await db.storage.from('expense-receipts').createSignedUrl(data.receipt_path, 60, { download: true });
    if (signed.error || !signed.data) return new Response('No se pudo abrir el comprobante', { status: 503 });
    return new Response(null, { status: 302, headers: { Location: signed.data.signedUrl, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch { return new Response('Comprobante no disponible', { status: 503 }); }
}
