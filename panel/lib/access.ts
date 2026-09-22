import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
export function accessConfigured() { return Boolean(process.env.PANEL_USERNAME && process.env.PANEL_PASSWORD); }
export function authorized(header: string | null) {
  if (!accessConfigured() || !header?.startsWith('Basic ')) return false;
  const actual = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const expected = process.env.PANEL_USERNAME + ':' + process.env.PANEL_PASSWORD;
  return timingSafeEqual(createHash('sha256').update(actual).digest(), createHash('sha256').update(expected).digest());
}
