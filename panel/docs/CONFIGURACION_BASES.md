# Bases de datos del panel Vivat

La nueva base necesita **una tabla** y **un bucket privado**. La base actual de Vivat no necesita tablas ni columnas nuevas para este panel. Los ingresos siguen viniendo de `Pago_pasaporte` y los indicadores de `Perfil`, `Publicacion`, `Solicitud`, `Contrato` y `Historial_Estado_Contrato`.

## Qué crear en el proyecto financiero

| Recurso | Finalidad |
| --- | --- |
| `public.expenses` | Un registro por gasto real. El campo `kind` indica si es fijo, variable o varios. |
| `storage` bucket `expense-receipts` | Archivos PDF, JPG o PNG de los comprobantes. Privado, hasta 5 MB por archivo. |

Columnas de `expenses`:

| Columna | Tipo | Uso |
| --- | --- | --- |
| `id` | `uuid`, clave primaria | Evita duplicados al reintentar guardar. |
| `description` | `text` | Concepto del gasto. |
| `category` | `text` | Categoría libre, por ejemplo Infraestructura. |
| `kind` | `text` | `fijo`, `variable` o `varios`. |
| `amount_cents` | `bigint` | Importe en centavos para cálculos exactos. |
| `currency` | `text` | `ARS` en esta versión. |
| `incurred_on` | `date` | Fecha usada para los balances. |
| `receipt_path` | `text`, único | Ruta interna del archivo en el bucket privado. |
| `receipt_name` | `text` | Nombre original para mostrar al usuario. |
| `created_by` | `text` | Cuenta del panel que cargó el gasto. |
| `created_at` | `timestamptz` | Momento en que se registró. |

El SQL exacto está en [`finance-schema.sql`](finance-schema.sql). Cada gasto exige un comprobante. Los costos fijos se cargan una vez por período: todavía no hay generación automática de recurrencias, por lo que no se necesita una tabla adicional.

## Cómo conectar las dos bases

1. Crear un **proyecto Supabase nuevo** para finanzas. Esto supone un segundo proyecto y puede tener costo según la organización y el plan. Revisar el costo mostrado por Supabase antes de crearlo.
2. En ese proyecto nuevo, abrir **SQL Editor**, pegar `finance-schema.sql` y ejecutarlo. Confirmar que aparece `public.expenses` y que en Storage existe `expense-receipts` con acceso **privado**.
3. En **Settings → API Keys**, obtener la URL y una clave **secret** (`sb_secret_...`) de cada proyecto: la base actual de Vivat y la nueva base financiera. La [guía de claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys) distingue estas claves de las publicables. No pegar secretos en el chat ni usar nombres `NEXT_PUBLIC_` para ellas.
4. Completar las cuatro variables `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `FINANCE_SUPABASE_URL` y `FINANCE_SUPABASE_SECRET_KEY` en `panel/.env.local`, siguiendo `.env.example`. La URL de la base actual ya está en `NEXT_PUBLIC_SUPABASE_URL`, por lo que `SUPABASE_URL` se puede omitir localmente. Configurar también `PANEL_USERNAME` y `PANEL_PASSWORD` para habilitar el acceso privado y la carga de gastos.
5. Reiniciar el servidor Next.js. Si el despliegue está en un proveedor, cargar las mismas variables en la configuración **solo de servidor** y volver a desplegar. Usar HTTPS para el panel publicado.
6. Verificar: los indicadores de la app deben dejar de mostrar `—`; registrar un gasto de prueba con PDF/JPG/PNG en la base financiera, comprobar que aparece en la tabla y que se puede descargar el comprobante; confirmar que el balance se actualiza. Luego eliminar el gasto de prueba manualmente desde Supabase si es necesario.

No hace falta conectar PostgreSQL con PostgreSQL ni copiar pagos. El **servidor de Next.js** abre un cliente para cada URL. Lee los pagos e indicadores en Vivat, lee y escribe gastos en Finanzas y combina ambos importes en el panel. Por eso no hay una clave foránea entre proyectos. Si más adelante se quiere asociar un gasto a un pago o contrato específico, se puede agregar una columna de referencia externa y validarla desde el servidor; no sería una clave foránea entre bases.

```text
Navegador → panel Next.js (autenticado)
                 ├─ lectura → Supabase Vivat: pagos y métricas
                 ├─ lectura/escritura → Supabase Finanzas: expenses
                 └─ archivos privados → Supabase Finanzas: expense-receipts
```

Las claves secret dan acceso amplio a cada proyecto y permanecen en el servidor. La clave pública que usa la app de Vivat no sirve para el panel global por las políticas RLS: devuelve conteos incompletos. Para una futura instalación de mayor escala se puede reemplazar el acceso amplio por una API de agregados con permisos de solo lectura, sin cambiar la base financiera.
