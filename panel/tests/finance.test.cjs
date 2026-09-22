/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test runner */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const filename = path.resolve(__dirname, '../lib', file + '.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', source)(id => id.startsWith('./') ? load(id.slice(2)) : require(id), mod, mod.exports);
  return mod.exports;
}
const { getPeriod, validDate } = load('period');
const { parseExpense, financeTotals, receiptType } = load('finance-validation');
function form(amount = '10.25') {
  const data = new FormData();
  Object.entries({ amount, description: 'Servidor', category: 'Infraestructura', kind: 'fijo', incurred_on: '2026-09-22' }).forEach(([key, value]) => data.set(key, value));
  return data;
}
test('Rango inclusivo por días argentinos y fin exclusivo', () => {
  const p = getPeriod('2026-09-01', '2026-09-30');
  assert.equal(p.start, '2026-09-01T00:00:00-03:00');
  assert.equal(p.end, '2026-10-01T03:00:00.000Z');
});
test('Rechaza fechas inexistentes, rangos invertidos y rangos excesivos', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.throws(() => getPeriod('2026-09-30', '2026-09-01'));
  assert.throws(() => getPeriod('2024-01-01', '2026-01-01'));
});
test('Importes se convierten a centavos sin acumulación de decimales', () => {
  assert.equal(parseExpense(form('10,25')).amount_cents, 1025);
  assert.equal(parseExpense(form('0.29')).amount_cents, 29);
  for (const amount of ['0', '-1', 'NaN', 'Infinity', '1e5', '2.345']) assert.throws(() => parseExpense(form(amount)));
});
test('Valida clasificación y campos requeridos', () => {
  const data = form(); data.set('kind', 'inventado');
  assert.throws(() => parseExpense(data));
  data.set('kind', 'fijo'); data.set('description', '  ');
  assert.throws(() => parseExpense(data));
});
test('No informa ganancia ni gasto cero cuando falta una fuente', () => {
  assert.deepEqual(financeTotals(100, null), { total: null, net: null });
  assert.deepEqual(financeTotals(null, []), { total: 0, net: null });
  assert.deepEqual(financeTotals(100, [{ amount_cents: 130 }]), { total: 130, net: -30 });
  assert.deepEqual(financeTotals(0, []), { total: 0, net: 0 });
});
test('Comprobantes rechazan HTML y detectan firmas admitidas', () => {
  assert.equal(receiptType(Buffer.from('<html>falso.pdf</html>')), null);
  assert.equal(receiptType(Buffer.from('%PDF-1.7')).mime, 'application/pdf');
  assert.equal(receiptType(Buffer.from([255,216,255,224])).mime, 'image/jpeg');
  assert.equal(receiptType(Buffer.from([137,80,78,71,13,10,26,10])).mime, 'image/png');
});
