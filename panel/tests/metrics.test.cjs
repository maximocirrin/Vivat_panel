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

const { getPeriod } = load('period');
const { calculateMetrics } = load('metrics-calculations');
const time = day => `2026-09-${day}T12:00:00Z`;
const sources = {
  profiles: [{ id_perfil: 1, created_at: time('02'), cuenta_verificada: true }],
  publications: [
    { id_publicacion: 1, id_propiedad: 10, id_perfil: 1, created_at: '2026-08-20T12:00:00Z' },
    { id_publicacion: 2, id_propiedad: 20, id_perfil: 1, created_at: time('02') },
    { id_publicacion: 3, id_propiedad: 10, id_perfil: 1, created_at: time('03') },
    { id_publicacion: 4, id_propiedad: 30, id_perfil: 1, created_at: '2026-10-01T12:00:00Z' },
  ],
  applications: [
    { id_solicitud: 1, id_perfil: 2, id_publicacion: 1, fecha_solicitud: time('03') },
    { id_solicitud: 2, id_perfil: 3, id_publicacion: 1, fecha_solicitud: time('03') },
    { id_solicitud: 3, id_perfil: 2, id_publicacion: 2, fecha_solicitud: time('04') },
  ],
  payments: [],
  publicationStates: [
    { id_estado_publicacion: 1, nombre: 'disponible' },
    { id_estado_publicacion: 4, nombre: 'pausada' },
    { id_estado_publicacion: 5, nombre: 'eliminada' },
  ],
  publicationHistory: [
    { id_historial_estado_publicacion: 1, id_publicacion: 1, id_estado_publicacion: 1, fecha_inicio: time('01'), fecha_fin: null },
    { id_historial_estado_publicacion: 2, id_publicacion: 1, id_estado_publicacion: 4, fecha_inicio: time('10'), fecha_fin: null },
    { id_historial_estado_publicacion: 3, id_publicacion: 1, id_estado_publicacion: 1, fecha_inicio: time('20'), fecha_fin: null },
    { id_historial_estado_publicacion: 4, id_publicacion: 2, id_estado_publicacion: 4, fecha_inicio: time('05'), fecha_fin: null },
    { id_historial_estado_publicacion: 5, id_publicacion: 2, id_estado_publicacion: 5, fecha_inicio: time('15'), fecha_fin: null },
    { id_historial_estado_publicacion: 6, id_publicacion: 3, id_estado_publicacion: 1, fecha_inicio: time('03'), fecha_fin: null },
    { id_historial_estado_publicacion: 7, id_publicacion: 4, id_estado_publicacion: 1, fecha_inicio: '2026-10-01T12:00:00Z', fecha_fin: null },
  ],
  contractStates: [
    { id_estado_contrato: 1, nombre: 'activo' },
    { id_estado_contrato: 5, nombre: 'pendiente_firma' },
  ],
  contractHistory: [
    { id_historial_contrato: 1, id_contrato: 1, id_estado_contrato: 5, fecha_inicio: time('04'), fecha_fin: null },
    { id_historial_contrato: 2, id_contrato: 2, id_estado_contrato: 5, fecha_inicio: time('05'), fecha_fin: null },
    { id_historial_contrato: 3, id_contrato: 2, id_estado_contrato: 1, fecha_inicio: time('10'), fecha_fin: null },
  ],
  contracts: [
    { id_contrato: 1, created_at: time('04') },
    { id_contrato: 2, created_at: time('05') },
  ],
};

test('Cuenta el último estado de cada publicación y no duplica propiedades', () => {
  const result = calculateMetrics(getPeriod('2026-09-01', '2026-09-30'), sources, Date.parse('2026-10-01T03:00:00Z'));
  assert.equal(result.unpausedPublications, 2);
  assert.equal(result.pausedPublications, 0);
  assert.equal(result.publishedProperties, 2);
  assert.equal(result.applicationsPerProperty, 1.5);
  assert.equal(result.propertiesWithApplications, 2);
  assert.equal(result.contracts, 2);
  assert.equal(result.activeContracts, 1);
  assert.equal(result.pendingContracts, 1);
  assert.equal(result.evolution.find(point => point.day === '2026-09-05').alquileres, 1);
});

test('El estado al cierre del período no usa cambios posteriores', () => {
  const result = calculateMetrics(getPeriod('2026-09-01', '2026-09-10'), sources, Date.parse('2026-10-01T03:00:00Z'));
  assert.equal(result.unpausedPublications, 1);
  assert.equal(result.pausedPublications, 2);
  assert.equal(result.activeContracts, 1);
  assert.equal(result.pendingContracts, 1);
});

test('No inventa un promedio cuando no hay propiedades publicadas', () => {
  const empty = Object.fromEntries(Object.keys(sources).map(key => [key, []]));
  const result = calculateMetrics(getPeriod('2026-09-01', '2026-09-30'), empty);
  assert.equal(result.applicationsPerProperty, null);
  assert.equal(result.unpausedPublications, 0);
  assert.equal(result.contracts, 0);
});
