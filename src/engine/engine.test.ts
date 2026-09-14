// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG, advance, bulkCost, buy, canAdvance, enemyGold, enemyMaxHp, goldPerSecond, newGame, prestige, tick,
} from './engine.ts';
import type { GameState, TickResult } from './engine.ts';

// Luta até matar ou até o boss estourar o tempo.
function fight(state: GameState): TickResult & { ticks: number } {
  for (let ticks = 1; ; ticks++) {
    const r = tick(state);
    if (r.killed || r.bossFailed) return { ...r, ticks };
    state = r.state;
  }
}

// Jogador no início de `stage`, com a fase anterior já vencida.
function atStage(stage: number, overrides: Partial<GameState> = {}): GameState {
  return {
    ...newGame(),
    stage,
    highestStage: stage,
    highestCleared: stage - 1,
    enemyHp: enemyMaxHp(stage, CONFIG.startZone),
    ...overrides,
  };
}

test('inimigo morto renasce na mesma fase e paga ouro', () => {
  const r = fight(newGame());
  assert.equal(r.killed, true);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.gold, CONFIG.goldBase);
  assert.equal(r.state.enemyHp, enemyMaxHp(1, CONFIG.startZone));
});

test('Advance só libera depois do primeiro kill da fase', () => {
  const start = newGame();
  assert.equal(canAdvance(start), false);
  assert.equal(advance(start), null);

  const next = advance(fight(start).state);
  assert.ok(next);
  assert.equal(next.stage, 2);
  assert.equal(next.highestStage, 2);
  assert.equal(canAdvance(next), false);
});

test('boss não morto em 45s volta uma fase', () => {
  const r = fight(atStage(10));
  assert.equal(r.bossFailed, true);
  assert.equal(r.state.stage, 9);
  assert.equal(r.state.enemyHp, enemyMaxHp(9, CONFIG.startZone));
  assert.ok(Math.abs(r.ticks * CONFIG.tickSeconds - CONFIG.bossTimeout) < 0.15);
  assert.equal(canAdvance(r.state), true);
});

test('sair do boss exige escolher a zona, que muda vida e ouro', () => {
  const cleared = atStage(10, { highestCleared: 10 });
  assert.throws(() => advance(cleared));

  const next = advance(cleared, 'ruins');
  assert.ok(next);
  assert.equal(next.stage, 11);
  assert.equal(next.zone, 'ruins');
  assert.equal(next.enemyHp, enemyMaxHp(11, 'ruins'));
  assert.ok(Math.abs(enemyMaxHp(11, 'ruins') / enemyMaxHp(11, 'catacombs') - 1.4) < 1e-9);
  assert.ok(Math.abs(enemyGold(11, 'ruins') / enemyGold(11, 'catacombs') - 2) < 1e-9);
});

test('no máximo um kill por tick, mesmo com dano sobrando', () => {
  const start = newGame();
  const r = tick({ ...start, levels: { ...start.levels, attack: 300 } });
  assert.equal(r.killed, true);
  assert.equal(r.state.gold, CONFIG.goldBase);
});

test('Crit Chance não passa do teto de 50%', () => {
  const rich = { ...newGame(), gold: 1e30 };
  assert.ok(buy(rich, 'critChance'));
  assert.equal(buy({ ...rich, levels: { ...rich.levels, critChance: 50 } }, 'critChance'), null);
});

test('compra em lote custa o mesmo que comprar um por um', () => {
  const rich = { ...newGame(), gold: 1e6 };
  let oneByOne: GameState = rich;
  for (let i = 0; i < 10; i++) oneByOne = buy(oneByOne, 'attack')!;

  const ten = buy(rich, 'attack', 10);
  assert.ok(ten);
  assert.equal(ten.levels.attack, 10);
  assert.equal(ten.gold, rich.gold - bulkCost('attack', 0, 10));
  assert.ok(Math.abs(ten.gold - oneByOne.gold) < 1e-6);
});

test('compra em lote é tudo ou nada', () => {
  const rich = { ...newGame(), gold: 1e6 };
  assert.equal(buy({ ...rich, gold: bulkCost('attack', 0, 10) - 1 }, 'attack', 10), null);

  const nearCap = { ...rich, levels: { ...rich.levels, critChance: 45 } };
  assert.equal(buy(nearCap, 'critChance', 10), null);
  assert.equal(buy(nearCap, 'critChance', 5)?.levels.critChance, 50);
});

test('prestígio zera a run e guarda almas e maior fase', () => {
  const end = atStage(190, { gold: 1e20, levels: { ...newGame().levels, attack: 572 } });
  const next = prestige(end);
  assert.equal(next.souls, 1573); // floor(19 ^ 2.5)
  assert.equal(next.highestStage, 190);
  assert.equal(next.stage, 1);
  assert.equal(next.gold, 0);
  assert.equal(next.levels.attack, 0);
  assert.equal(next.zone, CONFIG.startZone);
});

test('ouro por segundo respeita o limite de um kill por tick', () => {
  // Fase 1: 5 de vida, 2 de dps → 2.5s por kill, 10 de ouro.
  assert.ok(Math.abs(goldPerSecond(newGame()) - 4) < 1e-9);

  const start = newGame();
  const strong = { ...start, levels: { ...start.levels, attack: 300 } };
  assert.ok(Math.abs(goldPerSecond(strong) - CONFIG.goldBase / CONFIG.tickSeconds) < 1e-9);
});
