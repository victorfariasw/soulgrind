// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber } from './format.ts';

test('abaixo de mil mostra inteiro truncado', () => {
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(999.9), '999');
});

test('K, M, B, T e depois aa, ab…', () => {
  assert.equal(formatNumber(4200), '4.20K');
  assert.equal(formatNumber(999_999), '999.99K');
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
