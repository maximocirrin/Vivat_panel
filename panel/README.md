# Vivat · Panel de gestión

Panel Next.js con lectura de métricas de Vivat, Google Analytics 4 y registro de gastos con comprobantes en una base independiente.

## Ejecutar

Desde esta carpeta: `npm install`, `npm run dev` y abrir http://localhost:3000.
Configuración documentada en `.env.example`; mantener las credenciales en `.env.local`.
`npm run lint`, `npm run test` y `npm run build` verifican el proyecto.

## Conexiones pendientes

El paso a paso y las columnas requeridas están en [`docs/CONFIGURACION_BASES.md`](docs/CONFIGURACION_BASES.md).

1. Base de la app: `SUPABASE_URL` y `SUPABASE_SECRET_KEY` del servidor. Se conserva la URL pública existente como alternativa y se admite la clave legacy `SUPABASE_SERVICE_ROLE_KEY`. El panel solo ejecuta SELECT contra esta base. La clave privada tiene más privilegios que los usados por el código: para mínimo privilegio, sustituir posteriormente por una API de agregados con rol de solo lectura. No entregar una clave privada al navegador. La anon key NO sirve para métricas globales: la auditoría encontró 12 publicaciones y la API pública solo veía 5.
2. Base financiera: crear un proyecto Supabase separado y revisar/ejecutar `docs/finance-schema.sql` allí. Configurar `FINANCE_SUPABASE_URL` y `FINANCE_SUPABASE_SECRET_KEY`. Se admite también la clave legacy `FINANCE_SUPABASE_SERVICE_ROLE_KEY`. El código rechaza el mismo hostname que la base de Vivat.
3. Acceso del equipo: definir `PANEL_USERNAME` y una contraseña larga en `PANEL_PASSWORD`. El navegador pide autenticación HTTP Basic; publicar únicamente detrás de HTTPS. Producción falla cerrada sin configuración. El modo desarrollo permite ver el estado de configuración, pero las API financieras requieren autenticación.
4. Analytics: el entorno existente usa `NEXT_PUBLIC_GA_PROPERTY_ID` y `google-credentials.json`. También admite `GA_PROPERTY_ID`, `GOOGLE_ANALYTICS_CREDENTIALS_JSON` y `GOOGLE_APPLICATION_CREDENTIALS`. La cuenta de servicio debe tener acceso a la propiedad. Confirmar el evento instrumentado antes de definir `GA_APPLICATION_EVENT`.

No se crearon tablas ni se modificó la base de Vivat. El archivo SQL es una propuesta para la base nueva.

## Qué mide

- Rango por defecto: mes actual hasta hoy, con límites de fecha en Argentina (UTC−3). Máximo 367 días; los rangos inválidos muestran aviso y vuelven al mes actual.
- Perfiles nuevos y verificados, publicaciones nuevas, publicadores únicos, postulaciones, postulantes únicos y publicadores que recibieron postulaciones.
- Publicaciones sin pausa y pausadas: estado más reciente de `Historial_Estado_Publicacion` al cierre del período o al momento actual si es anterior. Se excluyen las publicaciones eliminadas del conteo sin pausa y las creadas después del cierre.
- Postulaciones por propiedad: postulaciones del período divididas por las propiedades distintas con alguna publicación creada hasta el cierre. Incluye propiedades que no recibieron postulaciones; sin propiedades, el promedio no se muestra. También se indica cuántas propiedades recibieron al menos una.
- Alquileres generados: contratos creados en el período, incluidos los pendientes de firma. Activos y pendientes de firma al cierre: último estado vigente de `Historial_Estado_Contrato`, al cierre del período o al momento actual si es anterior. El gráfico diario usa la fecha de creación de cada contrato.
- Pasaportes pagados: pasaportes únicos con al menos un Pago_pasaporte.estado = approved. Los pagos aprobados se cuentan por separado.
- Ingresos brutos: suma del monto de pagos actualmente aprobados, usando created_at como fecha de referencia. ARS es la moneda operativa acordada para esta primera versión. Pago_pasaporte no tiene moneda ni fecha de acreditación. No se asimilan pasaportes emitidos a pagos.
- Resultado neto registrado: ingresos brutos menos gastos cargados por fecha del gasto. No es un cierre contable auditado. Comisiones e impuestos deben cargarse como gastos; no se infieren. No incluye ingresos de corredores.
- El estado actual del pago puede cambiar el histórico (p. ej. reembolsos). Para conciliación por fecha de acreditación y reembolsos parciales hará falta una fuente de movimientos del proveedor; no se inventan estos datos.
- GA4: usuarios activos, sesiones, vistas e interacción para el mismo rango, sujeto a la zona horaria configurada en la propiedad GA4. Los clics solo se consultan con un evento confirmado. No se presenta una conversión entre visitas, clics y pasaportes como si fueran cohortes de personas.

## Gastos y comprobantes

Cada registro incluye concepto, categoría, tipo fijo/variable/varios, importe en centavos, fecha y comprobante obligatorio PDF/JPG/PNG de hasta 5 MB. Se comprueba la firma del archivo. Storage privado, enlaces de descarga válidos por 60 segundos y acceso autenticado. El identificador del formulario permite reintentar sin duplicar un gasto; si falla el registro se intenta limpiar el archivo huérfano.

Los costos fijos se registran una vez por cada período correspondiente. Esta versión no genera recurrencias automáticamente, no edita ni elimina gastos. CSV exporta los registros que coinciden con los filtros, sin enlaces a comprobantes. No se mezclan presupuestos estimados con gastos realizados.

La tabla expenses y el bucket expense-receipts son los únicos recursos nuevos requeridos. No hace falta modificar tablas existentes.

## Verificación y límites

Los datos se paginan de a 500 filas con orden estable; nunca se muestran resultados parcialmente truncados como totales. Hay un límite de seguridad de aproximadamente 100 mil filas por fuente; alcanzarlo produce estado no disponible. Para volúmenes superiores migrar las agregaciones a una API SQL de solo lectura.

Sin conexión, los indicadores muestran “—”, nunca cifras simuladas. El flujo real de persistencia y descarga deberá verificarse después de provisionar la base financiera. No usar datos reales de gastos hasta completar esa prueba.

Referencias: [Supabase Storage](https://supabase.com/docs/guides/storage/security/access-control), [métricas GA4](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema).

El estilo usa el logo original `img/logo-lite.webp` de la app, su bordó `#811b1e`, Inter y Manrope.
