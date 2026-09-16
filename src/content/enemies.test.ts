// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t } from '../strings.ts';
import { ENEMY_ICONS, enemyFor } from './enemies.ts';

test('o inimigo sai só da fase e da zona', () => {
  assert.deepEqual(enemyFor(37, 'ruins'), enemyFor(37, 'ruins'));
  assert.match(enemyFor(37, 'ruins').name, /^\w+ \w+ of the Ruins$/);
  assert.match(enemyFor(37, 'catacombs').name, / of the Pit$/);
  assert.match(enemyFor(37, 'ravine').name, / of the Rift$/);
});

test('fases seguidas nunca repetem a criatura e as 64 combinações cabem em 64 fases', () => {
  for (let stage = 1; stage < 500; stage++) {
    assert.notEqual(enemyFor(stage, 'ruins').icon, enemyFor(stage + 1, 'ruins').icon);
  }
  const names = new Set<string>();
  for (let stage = 1; stage <= 64; stage++) if (stage % 10 !== 0) names.add(enemyFor(stage, 'ruins').name);
  assert.equal(names.size, 64 - 6); // os 6 bosses entre 1 e 64 usam prefixo próprio
});

test('bosses usam Elder, Warden a cada 50 fases e The First a cada 100', () => {
  assert.match(enemyFor(10, 'ravine').name, /^Elder /);
  assert.match(enemyFor(50, 'ravine').name, /^Warden /);
  assert.match(enemyFor(100, 'ravine').name, /^The First /);
  assert.match(enemyFor(150, 'ravine').name, /^Warden /);
});

test('um ícone para cada criatura', () => {
  assert.equal(ENEMY_ICONS.length, t.enemyBases.length);
});
