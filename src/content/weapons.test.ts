// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, weaponIndexFor, weaponName } from './weapons.ts';

test('marcos de arma começam no nível 0 e só crescem', () => {
  assert.equal(WEAPONS[0].level, 0);
  for (let i = 1; i < WEAPONS.length; i++) assert.ok(WEAPONS[i].level > WEAPONS[i - 1].level);
  assert.equal(new Set(WEAPONS.map(weaponName)).size, WEAPONS.length);
});

test('a arma atual é o maior marco alcançado', () => {
  assert.equal(weaponIndexFor(0), 0);
  assert.equal(weaponIndexFor(24), 0);
  assert.equal(weaponIndexFor(25), 1);
  assert.equal(weaponName(WEAPONS[weaponIndexFor(25)]), 'Shortsword');
  assert.equal(weaponIndexFor(1e6), WEAPONS.length - 1);
});
