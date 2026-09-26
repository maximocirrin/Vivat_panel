import type { Period } from './period';

export type MetricRow = Record<string, string | number | boolean | null>;

type Sources = {
  profiles: MetricRow[];
  publications: MetricRow[];
  applications: MetricRow[];
  payments: MetricRow[];
  publicationStates: MetricRow[];
  publicationHistory: MetricRow[];
  contractStates: MetricRow[];
  contractHistory: MetricRow[];
  contracts: MetricRow[];
};

function statesAtCutoff(history: MetricRow[], entityId: string, historyId: string, cutoff: number) {
  const latest = new Map<MetricRow[string], MetricRow>();
  for (const row of history) {
    const start = Date.parse(String(row.fecha_inicio));
    if (!Number.isFinite(start) || start > cutoff || (row.fecha_fin && Date.parse(String(row.fecha_fin)) <= cutoff)) continue;
    const previous = latest.get(row[entityId]);
    if (!previous || start > Date.parse(String(previous.fecha_inicio)) ||
      (start === Date.parse(String(previous.fecha_inicio)) && Number(row[historyId]) > Number(previous[historyId]))) {
      latest.set(row[entityId], row);
    }
  }
  return latest;
}

export function calculateMetrics(period: Period, sources: Sources, now = Date.now()) {
  const { profiles, publications, applications, payments, publicationStates, publicationHistory, contractStates, contractHistory, contracts } = sources;
  const inside = (date: unknown) => typeof date === 'string' && Date.parse(date) >= Date.parse(period.start) && Date.parse(date) < Date.parse(period.end);
  const cutoff = Math.min(now, Date.parse(period.end) - 1);
  const newPublications = publications.filter(p => inside(p.created_at));
  const publishedByCutoff = publications.filter(p => typeof p.created_at === 'string' && Date.parse(p.created_at) <= cutoff);
  const approved = payments.filter(p => p.estado === 'approved');
  const publicationsById = new Map(publications.map(p => [p.id_publicacion, p]));
  const publishedProperties = new Set(publishedByCutoff.map(p => p.id_propiedad).filter(id => id != null));
  const propertiesWithApplications = new Set(applications.map(a => publicationsById.get(a.id_publicacion)?.id_propiedad).filter(id => id != null));
  const publicationStateById = new Map(publicationStates.map(s => [s.id_estado_publicacion, String(s.nombre).trim().toLowerCase()]));
  const publicationStatus = statesAtCutoff(publicationHistory, 'id_publicacion', 'id_historial_estado_publicacion', cutoff);
  const publicationCounts = { unpaused: 0, paused: 0 };
  for (const publication of publishedByCutoff) {
    const state = publicationStatus.get(publication.id_publicacion);
    const name = state && publicationStateById.get(state.id_estado_publicacion);
    if (name === 'pausada') publicationCounts.paused++;
    else if (name && name !== 'eliminada') publicationCounts.unpaused++;
  }
  const contractStateById = new Map(contractStates.map(s => [s.id_estado_contrato, String(s.nombre).trim().toLowerCase()]));
  const contractStatus = statesAtCutoff(contractHistory, 'id_contrato', 'id_historial_contrato', cutoff);
  const statusCount = (name: string) => [...contractStatus.values()].filter(row => contractStateById.get(row.id_estado_contrato) === name).length;
  const evolution = new Map<string, { day: string; perfiles: number; publicaciones: number; solicitudes: number; alquileres: number }>();
  for (let d = Date.parse(period.from); d <= Date.parse(period.to); d += 86400000) {
    const day = new Date(d).toISOString().slice(0, 10);
    evolution.set(day, { day, perfiles: 0, publicaciones: 0, solicitudes: 0, alquileres: 0 });
  }
  for (const [items, key, date] of [[profiles, 'perfiles', 'created_at'], [newPublications, 'publicaciones', 'created_at'], [applications, 'solicitudes', 'fecha_solicitud'], [contracts, 'alquileres', 'created_at']] as const) {
    for (const row of items) {
      const timestamp = Date.parse(String(row[date]));
      if (!Number.isFinite(timestamp)) continue;
      const day = new Date(timestamp - 3 * 3600000).toISOString().slice(0, 10);
      const point = evolution.get(day);
      if (point) point[key]++;
    }
  }
  return {
    profiles: profiles.length,
    verified: profiles.filter(p => p.cuenta_verificada).length,
    publications: newPublications.length,
    unpausedPublications: publicationCounts.unpaused,
    pausedPublications: publicationCounts.paused,
    publishedProperties: publishedProperties.size,
    publishers: new Set(newPublications.map(p => p.id_perfil).filter(id => id != null)).size,
    applications: applications.length,
    applicationsPerProperty: publishedProperties.size ? applications.length / publishedProperties.size : null,
    applicants: new Set(applications.map(a => a.id_perfil).filter(id => id != null)).size,
    propertiesWithApplications: propertiesWithApplications.size,
    ownersWithApplications: new Set(applications.map(a => publicationsById.get(a.id_publicacion)?.id_perfil).filter(id => id != null)).size,
    contracts: contracts.length,
    activeContracts: contractStates.some(s => String(s.nombre).trim().toLowerCase() === 'activo') ? statusCount('activo') : null,
    pendingContracts: contractStates.some(s => String(s.nombre).trim().toLowerCase() === 'pendiente_firma') ? statusCount('pendiente_firma') : null,
    approvedPayments: approved.length,
    passports: new Set(approved.map(p => p.id_pasaporte)).size,
    grossCents: approved.every(p => p.monto != null && Number.isFinite(Number(p.monto)) && Number(p.monto) >= 0) ? approved.reduce((sum, p) => sum + Math.round(Number(p.monto) * 100), 0) : null,
    evolution: [...evolution.values()],
  };
}
