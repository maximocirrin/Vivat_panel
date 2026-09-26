import 'server-only';
import { metricsClient } from './supabase';
import { calculateMetrics, type MetricRow } from './metrics-calculations';
import type { Period } from './period';

export async function getMetrics(period: Period) {
  const db = metricsClient();
  if (!db) return { data: null, error: 'Las métricas de Vivat requieren acceso privado del servidor. La clave pública devuelve información incompleta.' };
  async function rows(table: string, columns: string, id: string, date?: string): Promise<MetricRow[]> {
    const result: MetricRow[] = [];
    for (let offset = 0; ; offset += 500) {
      let query = db!.from(table).select(columns).order(id).range(offset, offset + 499);
      if (date) query = query.gte(date, period.start).lt(date, period.end);
      const { data, error } = await query.abortSignal(AbortSignal.timeout(15000));
      if (error) throw new Error(table);
      const page = data as unknown as MetricRow[];
      result.push(...page);
      if (page.length < 500) return result;
      if (offset >= 100000) throw new Error('Dataset demasiado grande');
    }
  }
  try {
    const [profiles, publications, applications, payments, publicationStates, publicationHistory, contractStates, contractHistory, contracts] = await Promise.all([
      rows('Perfil', 'id_perfil,created_at,cuenta_verificada', 'id_perfil', 'created_at'),
      rows('Publicacion', 'id_publicacion,id_propiedad,id_perfil,created_at', 'id_publicacion'),
      rows('Solicitud', 'id_solicitud,id_perfil,id_publicacion,fecha_solicitud', 'id_solicitud', 'fecha_solicitud'),
      rows('Pago_pasaporte', 'id_pago_pasaporte,id_pasaporte,monto,estado,created_at', 'id_pago_pasaporte', 'created_at'),
      rows('Estado_Publicacion', 'id_estado_publicacion,nombre', 'id_estado_publicacion'),
      rows('Historial_Estado_Publicacion', 'id_historial_estado_publicacion,id_publicacion,id_estado_publicacion,fecha_inicio,fecha_fin', 'id_historial_estado_publicacion'),
      rows('Estado_contrato', 'id_estado_contrato,nombre', 'id_estado_contrato'),
      rows('Historial_Estado_Contrato', 'id_historial_contrato,id_contrato,id_estado_contrato,fecha_inicio,fecha_fin', 'id_historial_contrato'),
      rows('Contrato', 'id_contrato,created_at', 'id_contrato', 'created_at'),
    ]);
    return { data: calculateMetrics(period, { profiles, publications, applications, payments, publicationStates, publicationHistory, contractStates, contractHistory, contracts }), error: null };
  } catch {
    return { data: null, error: 'No se pudieron consultar todas las métricas de Vivat. Revisá el acceso del servidor; no se muestran totales parciales.' };
  }
}
