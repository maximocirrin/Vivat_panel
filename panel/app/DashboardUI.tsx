'use client';
import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Activity, ArrowDownLeft, ArrowUpRight, Building2, ChartNoAxesCombined, CreditCard, Download, FileText, LayoutDashboard, Plus, RefreshCw, Users, Wallet, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Period } from '@/lib/period';
import type { getMetrics } from '@/lib/metrics';
import type { getAnalyticsMetrics } from '@/lib/analytics';
import type { getExpenses } from '@/lib/finance';
import { financeTotals, type Expense } from '@/lib/finance-validation';

type Props = { period: Period; metrics: Awaited<ReturnType<typeof getMetrics>>; analytics: Awaited<ReturnType<typeof getAnalyticsMetrics>>; finances: Awaited<ReturnType<typeof getExpenses>>; periodError: string | null };
const money = (cents: number | null | undefined) => cents == null ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(cents / 100);
const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('es-AR');
const dateLabel = (date: string) => date.split('-').reverse().join('/');
function Stat({ title, value, detail, accent }: { title: string; value: string; detail: string; accent?: boolean }) {
  return <article className={'stat ' + (accent ? 'accent' : '')}><span>{title}</span><strong>{value}</strong><small>{detail}</small></article>;
}

export default function DashboardUI({ period, metrics, analytics, finances, periodError }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'expenses'>('overview');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [notice, setNotice] = useState('');
  const [kind, setKind] = useState('todos');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
  const requestId = useRef('');
  const dialog = useRef<HTMLDialogElement>(null);
  const m = metrics.data;
  const ga = analytics.data;
  const total = financeTotals(m?.grossCents ?? null, finances.data);
  const margin = total.net != null && m?.grossCents ? (total.net / m.grossCents * 100).toFixed(1) + '%' : '—';
  const expenses = (finances.data || []).filter(e => (kind === 'todos' || e.kind === kind) && (e.description + ' ' + e.category).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const errors = [periodError, metrics.error, analytics.error, finances.error].filter(Boolean);
  function showExpense() { requestId.current = crypto.randomUUID(); setFormError(''); setOpen(true); dialog.current?.showModal(); }
  function closeExpense() { if (!busy) { dialog.current?.close(); setOpen(false); } }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setFormError('');
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set('id', requestId.current);
    try {
      const response = await fetch('/api/expenses', { method: 'POST', body });
      const result = await response.json().catch(() => ({ error: 'No se pudo guardar. Revisá la conexión y el acceso al panel.' }));
      if (!response.ok) throw new Error(result.error);
      dialog.current?.close(); setOpen(false); form.reset();
      const recorded = String(body.get('incurred_on'));
      setNotice(recorded < period.from || recorded > period.to ? 'Gasto registrado. Su fecha está fuera del período seleccionado.' : 'Gasto y comprobante registrados.');
      startTransition(() => router.refresh());
    } catch (error) { setFormError((error as Error).message); }
    finally { setBusy(false); }
  }
  function exportCsv(rows: Expense[]) {
    const cell = (value: string | number) => '"' + String(value).replace(/^[=+\-@]/, "'$&").replaceAll('"', '""') + '"';
    const csv = [['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Importe ARS', 'Comprobante'], ...rows.map(e => [e.incurred_on, e.description, e.category, e.kind, (e.amount_cents / 100).toFixed(2), e.receipt_name || ''])].map(row => row.map(cell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'vivat-gastos-' + period.from + '-' + period.to + '.csv'; link.click(); URL.revokeObjectURL(url);
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Vivat · Inicio del panel"><Image className="brand-logo" src="/vivat-logo.webp" alt="Vivat" width={96} height={96} priority /><span className="brand-caption">PANEL</span></Link>
      <div className="workspace-label">ADMINISTRACIÓN</div>
      <nav aria-label="Secciones del panel">
        <button className={tab === 'overview' ? 'selected' : ''} onClick={() => setTab('overview')}><LayoutDashboard size={18} />Resumen general</button>
        <button className={tab === 'expenses' ? 'selected' : ''} onClick={() => setTab('expenses')}><Wallet size={18} />Gastos y costos</button>
      </nav>
      <div className="sidebar-bottom"><span className="avatar">V</span><div>Equipo Vivat<small>Panel de gestión</small></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span>Vivat <span className="muted">/</span> <b>{tab === 'overview' ? 'Resumen general' : 'Gastos y costos'}</b></span><span className="private-label"><span className="status-dot" />Espacio de administración</span></header>
      <main>
        <div className="page-heading"><div><span className="eyebrow">TU NEGOCIO, EN PERSPECTIVA</span><h1>{tab === 'overview' ? 'Resumen general' : 'Gastos y costos'}</h1><p>{tab === 'overview' ? 'Actividad de la plataforma y resultados de Vivat.' : 'Cada gasto, su categoría y su comprobante, en un solo lugar.'}</p></div>
          <div className="actions"><button className="button subtle" disabled={refreshing} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={16} className={refreshing ? 'spin' : ''} />{refreshing ? 'Actualizando…' : 'Actualizar'}</button><button className="button primary" onClick={showExpense}><Plus size={17} />Registrar gasto</button></div>
        </div>
        <form key={period.from + period.to} className="period-bar" method="get"><div><Activity size={16} /><strong>Período de análisis</strong></div><label>Desde<input aria-label="Desde" type="date" name="from" defaultValue={period.from} required /></label><label>Hasta<input aria-label="Hasta" type="date" name="to" defaultValue={period.to} required /></label><button className="button compact">Aplicar</button><span className="period-note">Hora de Argentina · ARS</span></form>
        {errors.length > 0 && <details className="connection-notice" open><summary>Conexiones pendientes · algunos indicadores no están disponibles</summary>{errors.map(error => <p key={error}>{error}</p>)}</details>}
        {notice && <div className="success-notice" role="status">{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
        <section aria-label="Resultados financieros">
          <div className="section-heading"><h2>Balance del período</h2><span>Pasaportes · ingresos actuales de Vivat</span></div>
          <div className="stats-grid">
            <Stat title="Ingresos brutos" value={money(m?.grossCents)} detail="Suma de pagos aprobados de pasaportes" />
            <Stat title="Gastos registrados" value={money(total.total)} detail="Costos fijos, variables y varios" />
            <Stat title="Resultado neto registrado" value={money(total.net)} detail="Ingresos brutos menos gastos registrados" accent />
            <Stat title="Margen sobre ingresos" value={margin} detail="Resultado neto / ingresos brutos" />
          </div>
          <p className="footnote">Base: fecha de creación del pago y fecha del gasto. Incluí comisiones, impuestos y demás costos como gastos para completar el resultado. No incluye ingresos futuros de corredores.</p>
        </section>
        {tab === 'overview' ? <>
          <div className="section-heading"><h2>Actividad de la plataforma</h2><span>Altas y actividad dentro del período</span></div>
          <div className="metrics-grid">
            {([
              ['Perfiles nuevos', m?.profiles, Users, 'Cuentas creadas'],
              ['Publicaciones nuevas', m?.publications, Building2, 'Publicadas en el período'],
              ['Postulaciones', m?.applications, FileText, number(m?.applicants) + ' postulantes únicos'],
              ['Pasaportes pagados', m?.passports, CreditCard, number(m?.approvedPayments) + ' pagos aprobados'],
            ] as const).map(([title, value, Icon, note]) => <article className="metric-card" key={title}><div className="metric-label"><span>{title}</span><Icon size={18} /></div><strong>{number(value)}</strong><small>{note}</small></article>)}
          </div>
          <div className="chart-grid">
            <section className="panel"><div className="panel-heading"><div><h2>Evolución de la actividad</h2><p>Altas diarias en Vivat</p></div><ChartNoAxesCombined size={20} /></div>
              {m ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={m.evolution} margin={{ top: 15, right: 12, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ece7e7" /><XAxis dataKey="day" tickFormatter={d => d.slice(8) + '/' + d.slice(5, 7)} minTickGap={35} tickLine={false} axisLine={false} fontSize={11} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} /><Tooltip labelFormatter={d => dateLabel(String(d))} /><Legend /><Area type="monotone" name="Perfiles" dataKey="perfiles" stroke="#811b1e" fill="#811b1e" fillOpacity={0.1} strokeWidth={2} /><Area type="monotone" name="Publicaciones" dataKey="publicaciones" stroke="#c35a5e" fill="#c35a5e" fillOpacity={0.05} strokeWidth={2} /><Area type="monotone" name="Postulaciones" dataKey="solicitudes" stroke="#817777" fill="#817777" fillOpacity={0.04} strokeWidth={2} /></AreaChart></ResponsiveContainer></div> : <div className="empty-chart"><ChartNoAxesCombined size={36} /><h3>La evolución aparecerá acá</h3><p>Conectá el acceso privado a las métricas de Vivat.</p></div>}
            </section>
            <section className="panel"><div className="panel-heading"><div><h2>Audiencia digital</h2><p>Google Analytics 4 · mismo período</p></div><span className={'source-badge ' + (!ga ? 'pending' : '')}>{ga ? 'Conectado' : 'Pendiente'}</span></div>
              <div className="audience"><div><span>Usuarios activos</span><strong>{number(ga?.users)}</strong></div><div><span>Sesiones</span><strong>{number(ga?.sessions)}</strong></div><div><span>Vistas de páginas / pantallas</span><strong>{number(ga?.views)}</strong></div><div><span>Tasa de interacción</span><strong>{ga ? (ga.engagement * 100).toFixed(1) + '%' : '—'}</strong></div><div><span>Clics en postularme</span><strong>{number(ga?.clicks)}</strong></div></div>
              <p className="footnote">El evento de postulación requiere confirmar su nombre en GA4. Estos conteos no constituyen un embudo de usuarios únicos.</p>
            </section>
          </div>
          <section className="panel secondary-metrics"><div><span>Perfiles verificados nuevos</span><strong>{number(m?.verified)}</strong></div><div><span>Perfiles que publicaron</span><strong>{number(m?.publishers)}</strong></div><div><span>Publicadores con postulaciones</span><strong>{number(m?.ownersWithApplications)}</strong></div><div><span>Contratos creados</span><strong>{number(m?.contracts)}</strong></div><div><span>Contratos activos al cierre*</span><strong>{number(m?.activeContracts)}</strong></div></section>
          <p className="footnote">* Según el último estado vigente del historial, al cierre del período o al momento actual si es anterior.</p>
        </> : <div className="cost-types">{(['fijo', 'variable', 'varios'] as const).map(type => <article className="panel" key={type}><span className="type-label">Costos {type === 'fijo' ? 'fijos' : type === 'variable' ? 'variables' : 'varios'}</span><strong>{money(finances.data ? finances.data.filter(e => e.kind === type).reduce((sum, e) => sum + Number(e.amount_cents), 0) : null)}</strong><p>{type === 'fijo' ? 'Alquileres, sueldos y suscripciones.' : type === 'variable' ? 'Comisiones, verificaciones y consumo.' : 'Compras puntuales y otros gastos.'}</p></article>)}</div>}
        <section className="panel expenses-panel"><div className="panel-heading"><div><h2>Registro de gastos</h2><p>Importes efectivamente registrados · {dateLabel(period.from)} al {dateLabel(period.to)}</p></div><button className="button subtle" disabled={!finances.data || !expenses.length} onClick={() => exportCsv(expenses)}><Download size={15} />Exportar CSV</button></div>
          <div className="table-toolbar"><input aria-label="Buscar gastos" placeholder="Buscar concepto o categoría…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filtrar tipo de gasto" value={kind} onChange={e => setKind(e.target.value)}><option value="todos">Todos los costos</option><option value="fijo">Fijos</option><option value="variable">Variables</option><option value="varios">Varios</option></select></div>
          {expenses.length ? <div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Categoría</th><th className="align-right">Importe</th><th>Comprobante</th></tr></thead><tbody>{expenses.map(expense => <tr key={expense.id}><td>{dateLabel(expense.incurred_on)}</td><td className="expense-name">{expense.description}</td><td><span className="tag">{expense.kind}</span></td><td>{expense.category}</td><td className="align-right">{money(expense.amount_cents)}</td><td><a className="receipt-link" href={'/api/expenses/' + expense.id + '/receipt'} target="_blank" rel="noreferrer"><FileText size={14} />Descargar</a></td></tr>)}</tbody></table></div> : <div className="empty-state"><span className="empty-icon"><Wallet size={25} /></span><h3>{finances.data ? 'No hay gastos para mostrar' : 'Tu registro de gastos está listo para conectar'}</h3><p>{finances.data ? 'Registrá un gasto o ajustá los filtros de búsqueda.' : 'Necesitamos la base financiera separada para guardar gastos y comprobantes.'}</p></div>}
          <div className="table-footer"><span>{expenses.length} registros visibles</span><span><ArrowDownLeft size={14} /> Fijos · Variables · Varios</span></div>
        </section>
        <footer className="page-footer"><span>vivat · Panel de gestión</span><span><ArrowUpRight size={13} />Datos consultados al cargar o actualizar</span></footer>
      </main>
    </div>
    <dialog ref={dialog} onCancel={e => { if (busy) e.preventDefault(); else setOpen(false); }} onClose={() => setOpen(false)}>
      {open && <form onSubmit={submit}><div className="panel-heading"><div><h2>Registrar gasto</h2><p>Importes en pesos argentinos (ARS)</p></div><button type="button" className="icon-button" onClick={closeExpense} disabled={busy} aria-label="Cerrar formulario"><X size={20} /></button></div>
        <label>Concepto<input name="description" required maxLength={160} placeholder="Ej. Servicio de verificación de identidad" autoFocus /></label>
        <div className="form-row"><label>Importe (ARS)<input name="amount" type="number" min="0.01" max="1000000000" step="0.01" required placeholder="0,00" /></label><label>Fecha del gasto<input name="incurred_on" type="date" defaultValue={period.to} required /></label></div>
        <div className="form-row"><label>Tipo de costo<select name="kind"><option value="fijo">Fijo</option><option value="variable">Variable</option><option value="varios">Varios</option></select></label><label>Categoría<input name="category" maxLength={80} required list="categories" placeholder="Ej. Infraestructura" /><datalist id="categories">{['Infraestructura', 'Marketing', 'Verificaciones', 'Comisiones de pago', 'Sueldos', 'Impuestos', 'Otros'].map(c => <option key={c}>{c}</option>)}</datalist></label></div>
        <label className="upload-label">Comprobante obligatorio<input name="receipt" type="file" accept=".pdf,.jpg,.jpeg,.png" required /><small>PDF, JPG o PNG · hasta 5 MB · acceso privado</small></label>
        <p className="footnote">Registrá cada costo fijo una vez por período. No se generan gastos recurrentes automáticamente.</p>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        {!finances.data && <p className="connection-notice">Podés revisar el formulario. Para guardar, primero conectá la base financiera y configurá el acceso privado.</p>}
        <div className="dialog-actions"><button type="button" className="button subtle" onClick={closeExpense} disabled={busy}>Cancelar</button><button className="button primary" disabled={busy || !finances.data}>{busy ? 'Guardando…' : 'Guardar gasto y comprobante'}</button></div>
      </form>}
    </dialog>
  </div>;
}
