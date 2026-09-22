import DashboardUI from './DashboardUI';
import { getPeriod } from '@/lib/period';
import { getMetrics } from '@/lib/metrics';
import { getAnalyticsMetrics } from '@/lib/analytics';
import { getExpenses } from '@/lib/finance';
import { headers } from 'next/headers';
import { accessConfigured, authorized } from '@/lib/access';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const query = await searchParams;
  if (accessConfigured() && !authorized((await headers()).get('authorization'))) return <main>Acceso no autorizado.</main>;
  if (!accessConfigured() && process.env.NODE_ENV !== 'development') return <main>Configurá el acceso privado del panel.</main>;
  let period;
  let periodError: string | null = null;
  try { period = getPeriod(query.from, query.to); } catch (e) { period = getPeriod(); periodError = (e as Error).message; }
  const [metrics, analytics, finances] = await Promise.all([getMetrics(period), getAnalyticsMetrics(period), getExpenses(period)]);
  return <DashboardUI period={period} metrics={metrics} analytics={analytics} finances={finances} periodError={periodError} />;
}
