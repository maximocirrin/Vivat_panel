import 'server-only';
import { metricsClient } from './supabase';
import type { Period } from './period';
type Row = Record<string, string | number | boolean | null>;
export async function getMetrics(period: Period) {
  const db = metricsClient();
  if (!db) return { data: null, error: 'Las métricas de Vivat requieren acceso privado del servidor. La clave pública devuelve información incompleta.' };
  async function rows(table: string, columns: string, id: string, date?: string): Promise<Row[]> {
    const result: Row[] = [];
    for (let offset = 0; ; offset += 500) {
      let query = db!.from(table).select(columns).order(id).range(offset, offset + 499);
      if (date) query = query.gte(date, period.start).lt(date, period.end);
      const { data, error } = await query.abortSignal(AbortSignal.timeout(15000));
      if (error) throw new Error(table);
      const page = data as unknown as Row[];
      result.push(...page);
      if (page.length < 500) return result;
      if (offset >= 100000) throw new Error('Dataset demasiado grande');
    }
  }
  try {
    const [profiles, publications, applications, payments, states, history, contracts] = await Promise.all([
      rows('Perfil', 'id_perfil,created_at,cuenta_verificada', 'id_perfil', 'created_at'),
      rows('Publicacion', 'id_publicacion,id_perfil,created_at', 'id_publicacion'),
      rows('Solicitud', 'id_solicitud,id_perfil,id_publicacion,fecha_solicitud', 'id_solicitud', 'fecha_solicitud'),
      rows('Pago_pasaporte', 'id_pago_pasaporte,id_pasaporte,monto,estado,created_at', 'id_pago_pasaporte', 'created_at'),
      rows('Estado_contrato', 'id_estado_contrato,nombre', 'id_estado_contrato'),
      rows('Historial_Estado_Contrato', 'id_historial_contrato,id_contrato,id_estado_contrato,fecha_inicio,fecha_fin', 'id_historial_contrato'),
      rows('Contrato', 'id_contrato,created_at', 'id_contrato', 'created_at'),
    ]);
    const inside = (date: unknown) => typeof date === 'string' && Date.parse(date) >= Date.parse(period.start) && Date.parse(date) < Date.parse(period.end);
    const newPublications = publications.filter(p => inside(p.created_at));
    const approved = payments.filter(p => p.estado === 'approved');
    const owners = new Map(publications.map(p => [p.id_publicacion, p.id_perfil]));
    const activeId = states.find(s => s.nombre === 'activo')?.id_estado_contrato;
    const latest = new Map<unknown, Row>();
    const cutoff = Math.min(Date.now(), Date.parse(period.end) - 1);
    for (const h of history) {
      const start = Date.parse(String(h.fecha_inicio));
      if (start > cutoff || (h.fecha_fin && Date.parse(String(h.fecha_fin)) <= cutoff)) continue;
      const old = latest.get(h.id_contrato);
      if (!old || start > Date.parse(String(old.fecha_inicio)) || (start === Date.parse(String(old.fecha_inicio)) && Number(h.id_historial_contrato) > Number(old.id_historial_contrato))) latest.set(h.id_contrato, h);
    }
    const evolution = new Map<string, { day: string; perfiles: number; publicaciones: number; solicitudes: number }>();
    for (let d = Date.parse(period.from); d <= Date.parse(period.to); d += 86400000) {
      const day = new Date(d).toISOString().slice(0, 10);
      evolution.set(day, { day, perfiles: 0, publicaciones: 0, solicitudes: 0 });
    }
    for (const [items, key, date] of [[profiles, 'perfiles', 'created_at'], [newPublications, 'publicaciones', 'created_at'], [applications, 'solicitudes', 'fecha_solicitud']] as const) {
      for (const row of items) {
        const day = new Date(Date.parse(String(row[date])) - 3 * 3600000).toISOString().slice(0, 10);
        const point = evolution.get(day);
        if (point) point[key]++;
      }
    }
    return { data: {
      profiles: profiles.length, verified: profiles.filter(p => p.cuenta_verificada).length,
      publications: newPublications.length, publishers: new Set(newPublications.map(p => p.id_perfil).filter(p => p != null)).size,
      applications: applications.length, applicants: new Set(applications.map(p => p.id_perfil).filter(p => p != null)).size,
      ownersWithApplications: new Set(applications.map(a => owners.get(a.id_publicacion)).filter(p => p != null)).size,
      contracts: contracts.length, activeContracts: activeId == null ? null : [...latest.values()].filter(h => h.id_estado_contrato === activeId).length,
      approvedPayments: approved.length, passports: new Set(approved.map(p => p.id_pasaporte)).size,
      grossCents: approved.every(p => p.monto != null && Number.isFinite(Number(p.monto)) && Number(p.monto) >= 0) ? approved.reduce((sum, p) => sum + Math.round(Number(p.monto) * 100), 0) : null,
      evolution: [...evolution.values()],
    }, error: null };
  } catch {
    return { data: null, error: 'No se pudieron consultar todas las métricas de Vivat. Revisá el acceso del servidor; no se muestran totales parciales.' };
  }
}
