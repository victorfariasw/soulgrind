// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, enemyMaxHp, newGame } from './engine.ts';
import { SAVE_VERSION, parseSave, serializeSave } from './save.ts';

test('save ida e volta preserva o progresso e recria o inimigo cheio', () => {
  const start = newGame(12);
  const played = {
    ...start,
    stage: 37, highestStage: 40, highestCleared: 36, gold: 1.5e9, zone: 'ruins' as const,
    levels: { ...start.levels, attack: 90, critChance: 50 },
    enemyHp: 1, bossTimeLeft: 3,
  };

  const loaded = parseSave(serializeSave(played, 1_700_000_000_000));
  assert.ok(loaded);
  assert.equal(loaded.savedAt, 1_700_000_000_000);
  assert.deepEqual(loaded.game, { ...played, enemyHp: enemyMaxHp(37, 'ruins'), bossTimeLeft: CONFIG.zones.ruins.bossTimeout });
});

test('save corrompido ou de outra versão é descartado', () => {
  const ok = JSON.parse(serializeSave(newGame(), 0));
  const withGame = (patch: object) => JSON.stringify({ ...ok, game: { ...ok.game, ...patch } });

  assert.equal(parseSave('not json'), null);
  assert.equal(parseSave(JSON.stringify({ ...ok, version: SAVE_VERSION + 1 })), null);
  assert.equal(parseSave(withGame({ gold: -5 })), null);
  assert.equal(parseSave(withGame({ gold: null })), null); // Infinity vira null no JSON
  assert.equal(parseSave(withGame({ zone: 'moon' })), null);
  assert.equal(parseSave(withGame({ stage: 5, highestCleared: 1 })), null);
  assert.equal(parseSave(withGame({ levels: { ...ok.game.levels, critChance: 51 } })), null);
});

test('upgrade que não existia no save começa no nível 0', () => {
  const file = JSON.parse(serializeSave(newGame(), 0));
  delete file.game.levels.greed;
  const loaded = parseSave(JSON.stringify(file));
  assert.ok(loaded);
  assert.equal(loaded.game.levels.greed, 0);
});
