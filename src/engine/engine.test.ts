// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG, advance, applyOffline, autoAdvance, bulkCost, buy, canAdvance, climbZone, dps, enemyGold, enemyMaxHp,
  enterStage, goldPerSecond, isClimbing, newGame, nextSoulStage, prestige, tick,
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
    highestCleared: stage - 1,
    enemyHp: enemyMaxHp(stage, CONFIG.startZone),
    ...overrides,
  };
}

// Mata qualquer coisa das fases baixas num tick.
const strong = { ...newGame().levels, attack: 300 };

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
  assert.equal(canAdvance(next), false);
});

test('boss não morto a tempo volta uma fase', () => {
  const r = fight(atStage(10));
  assert.equal(r.bossFailed, true);
  assert.equal(r.state.stage, 9);
  assert.equal(r.state.enemyHp, enemyMaxHp(9, CONFIG.startZone));
  assert.ok(Math.abs(r.ticks * CONFIG.tickSeconds - CONFIG.zones[CONFIG.startZone].bossTimeout) < 0.15);
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

// Os dois testes abaixo fixam o desenho de zonas escolhido para o problema 5.
test('Ruins: o boss foge em 30s', () => {
  const r = fight(enterStage({ ...newGame(), highestCleared: 29 }, 30, 'ruins'));
  assert.equal(r.bossFailed, true);
  assert.ok(Math.abs(r.ticks * CONFIG.tickSeconds - 30) < 0.15);
  assert.equal(r.state.stage, 29);
  assert.equal(r.state.zone, 'ruins');
});

test('Ravine: o boss tem ×1.5 da vida do inimigo comum, e não ×2.5', () => {
  const bossRatio = (zone: 'ravine' | 'catacombs') => enemyMaxHp(30, zone) / enemyMaxHp(29, zone) / CONFIG.hpGrowth;
  assert.ok(Math.abs(bossRatio('ravine') - 1.5) < 1e-9);
  assert.ok(Math.abs(bossRatio('catacombs') - 2.5) < 1e-9);
});

test('no máximo um kill por tick, mesmo com dano sobrando', () => {
  const r = tick({ ...newGame(), levels: strong });
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

// Prestígio (problema 1): 1 alma por boss novo a partir da fase 30, ×1.9 de dano por alma.
test('boss vencido pela primeira vez vira recorde e, a partir da fase 30, uma alma pendente', () => {
  const r10 = tick(atStage(10, { levels: strong }));
  assert.equal(r10.state.record, 10);
  assert.equal(r10.state.pendingSouls, 0); // antes da fase 30 não rende alma

  const r30 = tick(atStage(30, { levels: strong, record: 20 }));
  assert.equal(r30.state.record, 30);
  assert.equal(r30.state.pendingSouls, 1);
  assert.equal(tick(r30.state).state.pendingSouls, 1); // o mesmo boss de novo não rende

  const belowRecord = tick(atStage(30, { levels: strong, record: 50 }));
  assert.equal(belowRecord.state.pendingSouls, 0);
  assert.equal(belowRecord.state.record, 50);

  assert.equal(nextSoulStage(0), 30);
  assert.equal(nextSoulStage(150), 160);
});

test('prestígio soma as almas da run, zera a run e mantém o recorde', () => {
  const end = atStage(157, { gold: 1e20, souls: 4, pendingSouls: 3, record: 150, levels: { ...newGame().levels, attack: 572 } });
  const next = prestige(end);
  assert.ok(next);
  assert.equal(next.souls, 7);
  assert.equal(next.pendingSouls, 0);
  assert.equal(next.record, 150);
  assert.equal(next.stage, 1);
  assert.equal(next.gold, 0);
  assert.equal(next.levels.attack, 0);
  assert.equal(next.zone, CONFIG.startZone);

  assert.equal(prestige({ ...end, pendingSouls: 0 }), null); // sem alma nova, nada a prestigiar
});

test('cada alma multiplica o dano por 1.9', () => {
  const start = newGame();
  assert.ok(Math.abs(dps({ ...start, souls: 2 }) / dps(start) - 1.9 * 1.9) < 1e-9);
});

test('subida automática: avança sozinha abaixo do recorde e para no recorde', () => {
  const climbing = { ...newGame(0, 50), levels: strong };
  assert.equal(isClimbing(climbing), true);
  assert.equal(autoAdvance(climbing), null); // ainda não matou nesta fase

  const next = autoAdvance(tick(climbing).state);
  assert.ok(next);
  assert.equal(next.stage, 2);

  const atRecord = atStage(50, { levels: strong, record: 50, highestCleared: 50 });
  assert.equal(isClimbing(atRecord), false);
  assert.equal(autoAdvance(atRecord), null); // daqui pra frente a escolha é do jogador
});

test('subida automática escolhe a zona mais rica cujo boss cai no tempo', () => {
  const next = autoAdvance(atStage(40, { record: 100, highestCleared: 40, levels: strong }));
  assert.ok(next);
  assert.equal(next.stage, 41);
  assert.equal(next.zone, 'ruins');

  const weak = atStage(40, { record: 100, highestCleared: 40 }); // dps 2: nenhum boss cai
  assert.equal(climbZone(weak), 'ravine');
});

test('subida automática para quando um boss vence o herói e volta ao passar de um boss', () => {
  const failed = fight(atStage(40, { record: 100 })); // dps 2 não mata o boss da fase 40
  assert.equal(failed.bossFailed, true);
  assert.equal(failed.state.climbPaused, true);
  assert.equal(autoAdvance(failed.state), null);

  const beaten = tick(atStage(40, { record: 100, climbPaused: true, levels: strong }));
  assert.equal(beaten.killed, true);
  assert.equal(beaten.state.climbPaused, false);
});

test('ouro por segundo respeita o limite de um kill por tick', () => {
  // Fase 1: 5 de vida, 2 de dps → 2.5s por kill, 10 de ouro.
  assert.ok(Math.abs(goldPerSecond(newGame()) - 4) < 1e-9);
  assert.ok(Math.abs(goldPerSecond({ ...newGame(), levels: strong }) - CONFIG.goldBase / CONFIG.tickSeconds) < 1e-9);
});

// Os dois testes abaixo fixam a regra da seção 5.4: 50% do ouro por segundo, até 8h.
test('offline rende metade do ouro por segundo da fase, com teto de 8h', () => {
  const start = newGame(); // fase 1: 4 de ouro por segundo
  const short = applyOffline(start, 100);
  assert.equal(short.seconds, 100);
  assert.ok(Math.abs(short.gold - 100 * 0.5 * 4) < 1e-9);
  assert.equal(short.state.gold, short.gold);

  const long = applyOffline(start, 3 * 24 * 3600);
  assert.equal(long.seconds, 8 * 3600);
  assert.ok(Math.abs(long.gold - 8 * 3600 * 0.5 * 4) < 1e-6);

  assert.equal(applyOffline(start, -50).gold, 0); // relógio do aparelho voltou no tempo
  assert.equal(applyOffline(start, NaN).gold, 0);
});

test('offline preso num boss que não mata a tempo conta a fase anterior', () => {
  const stuck = atStage(10); // dps 2 não mata o boss da fase 10 em 45s
  const expected = 60 * 0.5 * goldPerSecond(enterStage(stuck, 9, CONFIG.startZone));
  const r = applyOffline(stuck, 60);
  assert.ok(Math.abs(r.gold - expected) < 1e-9);
  assert.equal(r.state.stage, 10);
});
