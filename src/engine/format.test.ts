// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, formatNumber } from './format.ts';

test('duração fora do app em horas e minutos', () => {
  assert.equal(formatDuration(59), '0m');
  assert.equal(formatDuration(45 * 60), '45m');
  assert.equal(formatDuration(3 * 3600 + 12 * 60 + 40), '3h12m');
  assert.equal(formatDuration(2 * 3600 + 5 * 60), '2h05m');
  assert.equal(formatDuration(8 * 3600), '8h');
});

test('abaixo de mil mostra inteiro truncado', () => {
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(999.9), '999');
});

test('casas decimais só abaixo de mil, sempre truncadas', () => {
  assert.equal(formatNumber(2.16, 2), '2.16');
  assert.equal(formatNumber(0.349, 1), '0.3');
  assert.equal(formatNumber(1234.5, 2), '1.23K');
});

test('acima de mil, três algarismos significativos truncados', () => {
  assert.equal(formatNumber(4200), '4.20K');
  assert.equal(formatNumber(42_000), '42.0K');
  assert.equal(formatNumber(420_000), '420K');
  assert.equal(formatNumber(999_999), '999K');
});

test('K, M, B, T e depois aa, ab…', () => {
  assert.equal(formatNumber(2.5e6), '2.50M');
  assert.equal(formatNumber(1.5e12), '1.50T');
  assert.equal(formatNumber(1e15), '1.00aa');
  assert.equal(formatNumber(1e18), '1.00ab');
  assert.equal(formatNumber(1e90), '1.00az');
  assert.equal(formatNumber(1e93), '1.00ba');
});

test('aguenta até o limite do Number', () => {
  assert.ok(formatNumber(Number.MAX_VALUE).endsWith('dt'));
  assert.equal(formatNumber(Infinity), '∞');
});
