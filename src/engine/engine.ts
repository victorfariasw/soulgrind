// Motor do Soulgrind. Puro: sem React, sem I/O e nada roda no import.
// O mesmo arquivo é usado pelo app e por sim/simulate.ts.
//
// As constantes de CONFIG foram calibradas por simulação (CLAUDE.md, seção 4).
// Não mude nenhuma sem rodar `npm run sim` antes.

export type UpgradeId = keyof typeof CONFIG.upgrades;
export type ZoneId = keyof typeof CONFIG.zones;

export const CONFIG = {
  tickSeconds: 0.1,

  hpBase: 5,
  hpGrowth: 1.32,
  goldBase: 10,
  goldGrowth: 1.24,

  bossEvery: 10,

  // Só o ataque é multiplicativo. Os outros são aditivos de propósito —
  // dois ou mais multiplicadores exponenciais fazem o poder passar a
  // dificuldade e o jogo nunca mais trava.
  baseDamage: 2,
  attackMult: 1.08,
  baseSpeed: 1,
  speedPerLevel: 0.05,
  critChancePerLevel: 0.01,
  baseCritDamage: 1.5,
  critDamagePerLevel: 0.15,
  greedPerLevel: 0.05,

  // Prestígio: a curva ainda quebra por volta da run 4 (problema 1).
  prestigeMinStage: 30,
  soulsDivisor: 10,
  soulsExponent: 2.5,
  soulBonus: 1.008,

  // Progresso offline (seção 5.4): fração do ouro por segundo da fase atual,
  // com teto. Os dois limites existem pra jogar ativo continuar valendo mais.
  offlineEfficiency: 0.5,
  offlineMaxSeconds: 8 * 3600,

  // Crit Chance chega a 50% no nível 50; comprar além disso não faz nada.
  upgrades: {
    attack:     { baseCost: 5,  costGrowth: 1.085, maxLevel: Infinity },
    speed:      { baseCost: 40, costGrowth: 1.10,  maxLevel: Infinity },
    critChance: { baseCost: 40, costGrowth: 1.15,  maxLevel: 50 },
    critDamage: { baseCost: 60, costGrowth: 1.12,  maxLevel: Infinity },
    greed:      { baseCost: 30, costGrowth: 1.09,  maxLevel: Infinity },
  },

  // Fases 1-10 usam startZone; depois vale a zona escolhida após cada boss.
  // Os modificadores valem só dentro da zona e nunca acumulam.
  // bossHpMult multiplica a vida do inimigo comum da zona; bossTimeout é em segundos.
  startZone: 'catacombs',
  zones: {
    // Cada zona tem um papel (problema 5): Ruins é a mais rápida, mas o boss foge
    // cedo e ela sozinha não chega ao fim; Ravine é lenta, mas o boss fraco leva
    // mais fundo. No experimento, com 35s em Ruins ela voltava a dominar.
    ruins:     { hpMult: 1.4, goldMult: 2.0, bossHpMult: 2.5, bossTimeout: 30 },
    catacombs: { hpMult: 1.0, goldMult: 1.0, bossHpMult: 2.5, bossTimeout: 45 }, // alma extra no boss: ainda não simulada (problema 3)
    ravine:    { hpMult: 0.5, goldMult: 0.5, bossHpMult: 1.5, bossTimeout: 45 },
  },
} as const;

export const UPGRADE_IDS = Object.keys(CONFIG.upgrades) as UpgradeId[];
export const ZONE_IDS = Object.keys(CONFIG.zones) as ZoneId[];

export interface GameState {
  stage: number;
  highestStage: number;   // maior fase já alcançada, em qualquer run — base das almas
  highestCleared: number; // maior fase vencida nesta run — libera o Advance
  gold: number;
  souls: number;
  zone: ZoneId;           // zona do bloco de 10 fases atual
  levels: Record<UpgradeId, number>;
  enemyHp: number;
  bossTimeLeft: number;   // só conta em fase de boss
}

// O que define o poder do herói. Qualquer GameState serve; a tela de upgrades
// usa isso pra calcular o próximo nível sem montar um estado inteiro.
export type Stats = Pick<GameState, 'levels' | 'souls'>;

export interface TickResult {
  state: GameState;
  killed: boolean;
  goldGained: number;
  bossFailed: boolean;
}

export interface OfflineResult {
  state: GameState;
  seconds: number; // tempo que contou, já com o teto
  gold: number;
}

export function newGame(souls = 0): GameState {
  const levels = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) levels[id] = 0;
  return enterStage(
    { stage: 1, highestStage: 1, highestCleared: 0, gold: 0, souls, zone: CONFIG.startZone, levels, enemyHp: 0, bossTimeLeft: 0 },
    1,
    CONFIG.startZone,
  );
}

export function isBoss(stage: number): boolean {
  return stage % CONFIG.bossEvery === 0;
}

export function enemyMaxHp(stage: number, zone: ZoneId): number {
  const z = CONFIG.zones[zone];
  const boss = isBoss(stage) ? z.bossHpMult : 1;
  return CONFIG.hpBase * Math.pow(CONFIG.hpGrowth, stage - 1) * boss * z.hpMult;
}

export function enemyGold(stage: number, zone: ZoneId): number {
  return CONFIG.goldBase * Math.pow(CONFIG.goldGrowth, stage - 1) * CONFIG.zones[zone].goldMult;
}

export function bossTimeout(zone: ZoneId): number {
  return CONFIG.zones[zone].bossTimeout;
}

export function upgradeCost(id: UpgradeId, level: number): number {
  const u = CONFIG.upgrades[id];
  return u.baseCost * Math.pow(u.costGrowth, level);
}

// Custo de comprar `count` níveis seguidos a partir de `level`.
export function bulkCost(id: UpgradeId, level: number, count: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) total += upgradeCost(id, level + i);
  return total;
}

function attackDamage(stats: Stats): number {
  return CONFIG.baseDamage * Math.pow(CONFIG.attackMult, stats.levels.attack);
}

export function attacksPerSecond(stats: Stats): number {
  return CONFIG.baseSpeed + stats.levels.speed * CONFIG.speedPerLevel;
}

export function critChance(stats: Stats): number {
  return Math.min(stats.levels.critChance, CONFIG.upgrades.critChance.maxLevel) * CONFIG.critChancePerLevel;
}

export function critMultiplier(stats: Stats): number {
  return CONFIG.baseCritDamage + stats.levels.critDamage * CONFIG.critDamagePerLevel;
}

export function soulMultiplier(stats: Stats): number {
  return Math.pow(CONFIG.soulBonus, stats.souls);
}

// Dano de um golpe sem crítico. O combate usa só a média (dps); golpes
// individuais existem apenas na tela, para os números flutuantes.
export function hitDamage(stats: Stats): number {
  return attackDamage(stats) * soulMultiplier(stats);
}

// Mesma ordem de multiplicação de sempre — mudar a ordem muda os últimos bits
// e pode alterar desempates do simulador.
export function dps(stats: Stats): number {
  return attackDamage(stats) * attacksPerSecond(stats) * (1 + critChance(stats) * (critMultiplier(stats) - 1)) * soulMultiplier(stats);
}

export function goldMultiplier(stats: Stats): number {
  return 1 + stats.levels.greed * CONFIG.greedPerLevel;
}

// Ouro por segundo farmando o inimigo atual. Um kill leva um número inteiro de
// ticks, então matar mais rápido que um tick não rende mais.
export function goldPerSecond(state: GameState): number {
  const ticks = Math.max(1, Math.ceil(enemyMaxHp(state.stage, state.zone) / dps(state) / CONFIG.tickSeconds - 1e-9));
  return (enemyGold(state.stage, state.zone) * goldMultiplier(state)) / (ticks * CONFIG.tickSeconds);
}

export function soulsForStage(stage: number): number {
  if (stage < CONFIG.prestigeMinStage) return 0;
  return Math.floor(Math.pow(stage / CONFIG.soulsDivisor, CONFIG.soulsExponent));
}

export function enterStage(state: GameState, stage: number, zone: ZoneId): GameState {
  return { ...state, stage, zone, enemyHp: enemyMaxHp(stage, zone), bossTimeLeft: bossTimeout(zone) };
}

// Avança o combate `dt` segundos. Chamar num setInterval de CONFIG.tickSeconds,
// nunca por frame. No máximo um kill por tick: o dano excedente se perde.
// O inimigo morto renasce na mesma fase — avançar é sempre decisão do jogador.
export function tick(state: GameState, dt: number = CONFIG.tickSeconds): TickResult {
  const hp = state.enemyHp - dps(state) * dt;

  if (hp <= 0) {
    const goldGained = enemyGold(state.stage, state.zone) * goldMultiplier(state);
    const paid = { ...state, gold: state.gold + goldGained, highestCleared: Math.max(state.highestCleared, state.stage) };
    return { state: enterStage(paid, state.stage, state.zone), killed: true, goldGained, bossFailed: false };
  }

  if (isBoss(state.stage)) {
    const bossTimeLeft = state.bossTimeLeft - dt;
    if (bossTimeLeft <= 0) {
      // Não matou a tempo: volta uma fase, que é sempre do mesmo bloco de zona.
      return { state: enterStage(state, state.stage - 1, state.zone), killed: false, goldGained: 0, bossFailed: true };
    }
    return { state: { ...state, enemyHp: hp, bossTimeLeft }, killed: false, goldGained: 0, bossFailed: false };
  }

  return { state: { ...state, enemyHp: hp }, killed: false, goldGained: 0, bossFailed: false };
}

export function canAdvance(state: GameState): boolean {
  return state.highestCleared >= state.stage;
}

// Sair de uma fase de boss exige a zona do próximo bloco (tela de 3 cartas).
export function advance(state: GameState, nextZone?: ZoneId): GameState | null {
  if (!canAdvance(state)) return null;
  let zone = state.zone;
  if (isBoss(state.stage)) {
    if (!nextZone) throw new Error('advance: leaving a boss stage requires the next zone');
    zone = nextZone;
  }
  const stage = state.stage + 1;
  return enterStage({ ...state, highestStage: Math.max(state.highestStage, stage) }, stage, zone);
}

// Compra `count` níveis de uma vez, ou nada: sem ouro para todos, ou passando
// do teto, retorna null.
export function buy(state: GameState, id: UpgradeId, count = 1): GameState | null {
  const level = state.levels[id];
  if (count < 1 || level + count > CONFIG.upgrades[id].maxLevel) return null;
  const cost = bulkCost(id, level, count);
  if (state.gold < cost) return null;
  return { ...state, gold: state.gold - cost, levels: { ...state.levels, [id]: level + count } };
}

// Zera fase, ouro, upgrades e zona. Mantém almas e a maior fase histórica.
// Almas não somam entre runs: valem as da melhor fase já alcançada.
export function prestige(state: GameState): GameState {
  const souls = Math.max(state.souls, soulsForStage(state.highestStage));
  return { ...newGame(souls), highestStage: state.highestStage };
}

// Ouro por segundo que o herói faz sozinho. Preso num boss que não mata a tempo,
// o jogo voltaria uma fase — então conta a fase anterior.
export function idleGoldPerSecond(state: GameState): number {
  const stuck = isBoss(state.stage) && enemyMaxHp(state.stage, state.zone) / dps(state) > bossTimeout(state.zone);
  return goldPerSecond(stuck ? enterStage(state, state.stage - 1, state.zone) : state);
}

// Tempo fora do app vira só ouro: não compra upgrades nem avança de fase.
// Tempo negativo (relógio do aparelho voltou) ou inválido não rende nada.
export function applyOffline(state: GameState, awaySeconds: number): OfflineResult {
  const seconds = Number.isFinite(awaySeconds) ? Math.min(Math.max(0, awaySeconds), CONFIG.offlineMaxSeconds) : 0;
  const gold = seconds * CONFIG.offlineEfficiency * idleGoldPerSecond(state);
  return { state: { ...state, gold: state.gold + gold }, seconds, gold };
}
