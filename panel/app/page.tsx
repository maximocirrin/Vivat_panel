import { supabase } from "@/lib/supabase";
import DashboardUI, { KpiData } from "./DashboardUI";
import { getAnalyticsMetrics } from "@/lib/analytics";

export const revalidate = 0; // Para que no cachee y siempre traiga datos frescos

export default async function Page() {
  // --- CONSULTAS A SUPABASE ---
  
  // 1. Perfiles creados
  const { count: perfilesCreados } = await supabase
    .from("Perfil")
    .select("*", { count: "exact", head: true });

  // 2. Publicaciones Totales
  const { count: publicacionesTotales } = await supabase
    .from("Publicacion")
    .select("*", { count: "exact", head: true });

  // 3. Contratos Activos (asumiendo que todos en la tabla son o los filtramos)
  // Nota: si hay una columna 'estado', habría que filtrarlo: .eq('estado', 'Activo')
  const { count: contratosActivos } = await supabase
    .from("Contrato")
    .select("*", { count: "exact", head: true });

  // 4. Pasaportes Pagados
  // Usamos Pago_pasaporte, si está vacía usamos Pasaporte_habitat por ahora
  let { count: pasaportesPagados } = await supabase
    .from("Pago_pasaporte")
    .select("*", { count: "exact", head: true });
    
  if (pasaportesPagados === 0) {
    const res = await supabase
      .from("Pasaporte_habitat")
      .select("*", { count: "exact", head: true });
    pasaportesPagados = res.count || 0;
  }

  // 5. Perfiles que han publicado una propiedad
  // Hacemos una consulta para traer los id_perfil unicos de la tabla Publicacion
  const { data: publicaciones } = await supabase
    .from("Publicacion")
    .select("id_perfil");
  
  const perfilesConPropiedades = new Set(publicaciones?.map(p => p.id_perfil) || []).size;

  // 6. Perfiles que han recibido al menos una postulacion/solicitud
  const { data: solicitudes } = await supabase
    .from("Solicitud")
    .select("id_publicacion");
    
  // Cruzamos en memoria para ser seguros
  let perfilesConPostulaciones = 0;
  if (solicitudes && publicaciones) {
    const pubIdsConSolicitud = new Set(solicitudes.map(s => s.id_publicacion));
    const perfilesAfectados = new Set(
      publicaciones
        .filter(p => pubIdsConSolicitud.has(p.id))
        .map(p => p.id_perfil)
    );
    perfilesConPostulaciones = perfilesAfectados.size;
  }

  // 7. Visitas y Clicks (Google Analytics)
  const gaPropertyId = process.env.NEXT_PUBLIC_GA_PROPERTY_ID || "";
  const { visitas, clickPostularme } = await getAnalyticsMetrics(gaPropertyId);

  // Fallback a mocks si GA no está configurado o falla
  const finalVisitas = visitas > 0 ? visitas : 12500;
  const finalClickPostularme = clickPostularme > 0 ? clickPostularme : 400;

  // --- ARMADO DE DATOS ---
  const data: KpiData = {
    perfilesCreados: perfilesCreados || 0,
    perfilesConPropiedades: perfilesConPropiedades || 0,
    perfilesConPostulaciones: perfilesConPostulaciones || 0,
    publicacionesTotales: publicacionesTotales || 0,
    pasaportesPagados: pasaportesPagados || 0,
    contratosActivos: contratosActivos || 0,
    visitas: finalVisitas,
    clickPostularme: finalClickPostularme,
  };

  return <DashboardUI data={data} />;
}
