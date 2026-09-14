// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, enemyMaxHp, newGame } from './engine.ts';
import { SAVE_VERSION, parseSave, serializeSave } from './save.ts';

test('save ida e volta preserva o progresso e recria o inimigo cheio', () => {
  const start = newGame(12, 40);
  const played = {
    ...start,
    stage: 37, highestCleared: 36, gold: 1.5e9, pendingSouls: 2, zone: 'ruins' as const,
    levels: { ...start.levels, attack: 90, critChance: 50 },
    enemyHp: 1, bossTimeLeft: 3,
  };

  const loaded = parseSave(serializeSave(played, 1_700_000_000_000));
  assert.ok(loaded);
  assert.equal(loaded.savedAt, 1_700_000_000_000);
  assert.deepEqual(loaded.game, {
    ...played, enemyHp: enemyMaxHp(37, 'ruins'), bossTimeLeft: CONFIG.zones.ruins.bossTimeout, climbPaused: false,
  });
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
  assert.equal(parseSave(withGame({ record: 35 })), null); // recorde é sempre um boss
  assert.equal(parseSave(withGame({ stage: 37, highestCleared: 36, record: 20 })), null); // abaixo do boss 30 já vencido
});

test('upgrade que não existia no save começa no nível 0', () => {
  const file = JSON.parse(serializeSave(newGame(), 0));
  delete file.game.levels.greed;
  const loaded = parseSave(JSON.stringify(file));
  assert.ok(loaded);
  assert.equal(loaded.game.levels.greed, 0);
});

test('save da versão 1 (sem prestígio) vira versão 2 com as almas dos bosses já vencidos', () => {
  const v1 = {
    version: 1,
    savedAt: 5,
    game: { stage: 157, highestStage: 157, highestCleared: 156, gold: 10, souls: 0, zone: 'ravine', levels: newGame().levels },
  };
  const loaded = parseSave(JSON.stringify(v1));
  assert.ok(loaded);
  assert.equal(loaded.game.record, 150);
  assert.equal(loaded.game.pendingSouls, 13); // bosses 30, 40, …, 150
  assert.equal(loaded.game.souls, 0);
  assert.equal(loaded.game.stage, 157);
  assert.equal(loaded.game.zone, 'ravine');
});
