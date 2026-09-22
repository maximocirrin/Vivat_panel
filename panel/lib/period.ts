export type Period = { from: string; to: string; start: string; end: string };
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function getPeriod(from?: string, to?: string): Period {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const a = from || today.slice(0, 8) + '01';
  const b = to || today;
  if (!validDate(a) || !validDate(b) || a > b || (Date.parse(b) - Date.parse(a)) / 86400000 > 366) throw new Error('Elegí un rango válido de hasta 367 días.');
  return { from: a, to: b, start: a + 'T00:00:00-03:00', end: new Date(Date.parse(b + 'T00:00:00-03:00') + 86400000).toISOString() };
}
