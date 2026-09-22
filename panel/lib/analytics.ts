import 'server-only';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'node:path';
import type { Period } from './period';
export async function getAnalyticsMetrics(period: Period) {
  const propertyId = process.env.GA_PROPERTY_ID || process.env.NEXT_PUBLIC_GA_PROPERTY_ID;
  if (!propertyId) return { data: null, error: 'Falta configurar la propiedad de Google Analytics.' };
  try {
    const raw = process.env.GOOGLE_ANALYTICS_CREDENTIALS_JSON;
    const client = new BetaAnalyticsDataClient({
      ...(raw ? { credentials: JSON.parse(raw) } : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'google-credentials.json') }),
      fallback: true,
    });
    const base = { property: 'properties/' + propertyId, dateRanges: [{ startDate: period.from, endDate: period.to }] };
    const event = process.env.GA_APPLICATION_EVENT;
    const [report, clicks] = await Promise.all([
      client.runReport({ ...base, metrics: ['sessions', 'activeUsers', 'screenPageViews', 'engagementRate'].map(name => ({ name })) }, { timeout: 15000 }),
      event ? client.runReport({ ...base, metrics: [{ name: 'eventCount' }], dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: event, matchType: 'EXACT' } } } }, { timeout: 15000 }) : null,
    ]);
    const values = report[0].rows?.[0]?.metricValues;
    return { data: { sessions: Number(values?.[0]?.value || 0), users: Number(values?.[1]?.value || 0), views: Number(values?.[2]?.value || 0), engagement: Number(values?.[3]?.value || 0), clicks: clicks ? Number(clicks[0].rows?.[0]?.metricValues?.[0]?.value || 0) : null }, error: null };
  } catch {
    return { data: null, error: 'Google Analytics no está disponible. Revisá las credenciales y el acceso a la propiedad.' };
  }
}
