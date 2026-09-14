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

  // Prestígio (problema 1): cada boss vencido pela primeira vez, a partir da fase
  // 30, rende 1 alma; cada alma multiplica o dano por 1.9. A janela é estreita:
  // com ×1.8 o jogo para na fase ~1100, com ×2.0 passa do limite dos números.
  // Qualquer fonte extra de almas tira o teto do jogo — simular antes (problema 3).
  prestigeMinStage: 30,
  soulDamageMult: 1.9,

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
  // A ordem importa: a subida automática prefere a primeira zona que dá conta.
  startZone: 'catacombs',
  zones: {
    // Cada zona tem um papel (problema 5): Ruins é a mais rápida, mas o boss foge
    // cedo e ela sozinha não chega ao fim; Ravine é lenta, mas o boss fraco leva
    // mais fundo. No experimento, com 35s em Ruins ela voltava a dominar.
    ruins:     { hpMult: 1.4, goldMult: 2.0, bossHpMult: 2.5, bossTimeout: 30 },
    catacombs: { hpMult: 1.0, goldMult: 1.0, bossHpMult: 2.5, bossTimeout: 45 }, // neutra: alma extra quebrava a curva (problema 3)
    ravine:    { hpMult: 0.5, goldMult: 0.5, bossHpMult: 1.5, bossTimeout: 45 },
  },
} as const;

export const UPGRADE_IDS = Object.keys(CONFIG.upgrades) as UpgradeId[];
export const ZONE_IDS = Object.keys(CONFIG.zones) as ZoneId[];

export interface GameState {
  stage: number;
  highestCleared: number; // maior fase vencida nesta run — libera o Advance
  record: number;         // maior boss já vencido, em qualquer run — base das almas e da subida automática
  gold: number;
  souls: number;          // almas que já valem no dano
  pendingSouls: number;   // almas desta run: só valem depois de prestigiar
  zone: ZoneId;           // zona do bloco de 10 fases atual
  levels: Record<UpgradeId, number>;
  enemyHp: number;
  bossTimeLeft: number;   // só conta em fase de boss
  climbPaused: boolean;   // um boss venceu a subida automática; volta quando o herói passar de um boss
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

export function newGame(souls = 0, record = 0): GameState {
  const levels = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) levels[id] = 0;
  return enterStage(
    {
      stage: 1, highestCleared: 0, record, gold: 0, souls, pendingSouls: 0, zone: CONFIG.startZone,
      levels, enemyHp: 0, bossTimeLeft: 0, climbPaused: false,
    },
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

export function soulMultiplier(stats: Pick<GameState, 'souls'>): number {
  return Math.pow(CONFIG.soulDamageMult, stats.souls);
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

// Próximo boss que rende alma, dado o recorde.
export function nextSoulStage(record: number): number {
  return Math.max(record + CONFIG.bossEvery, CONFIG.prestigeMinStage);
}

export function enterStage(state: GameState, stage: number, zone: ZoneId): GameState {
  return { ...state, stage, zone, enemyHp: enemyMaxHp(stage, zone), bossTimeLeft: bossTimeout(zone) };
}

// Avança o combate `dt` segundos. Chamar num setInterval de CONFIG.tickSeconds,
// nunca por frame. No máximo um kill por tick: o dano excedente se perde.
// O inimigo morto renasce na mesma fase — avançar é sempre decisão do jogador,
// exceto na subida automática (autoAdvance), que o app chama depois do kill.
export function tick(state: GameState, dt: number = CONFIG.tickSeconds): TickResult {
  const hp = state.enemyHp - dps(state) * dt;
  const boss = isBoss(state.stage);

  if (hp <= 0) {
    const goldGained = enemyGold(state.stage, state.zone) * goldMultiplier(state);
    // Boss vencido pela primeira vez: novo recorde e, a partir da fase 30, uma alma.
    const newBoss = boss && state.stage > state.record;
    const paid: GameState = {
      ...state,
      gold: state.gold + goldGained,
      highestCleared: Math.max(state.highestCleared, state.stage),
      record: newBoss ? state.stage : state.record,
      pendingSouls: state.pendingSouls + (newBoss && state.stage >= CONFIG.prestigeMinStage ? 1 : 0),
      climbPaused: boss ? false : state.climbPaused,
    };
    return { state: enterStage(paid, state.stage, state.zone), killed: true, goldGained, bossFailed: false };
  }

  if (boss) {
    const bossTimeLeft = state.bossTimeLeft - dt;
    if (bossTimeLeft <= 0) {
      // Não matou a tempo: volta uma fase, que é sempre do mesmo bloco de zona.
      const fled = enterStage({ ...state, climbPaused: true }, state.stage - 1, state.zone);
      return { state: fled, killed: false, goldGained: 0, bossFailed: true };
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
  return enterStage(state, state.stage + 1, zone);
}

// Subida automática (exceção à seção 3): depois do prestígio, fases abaixo do
// recorde não têm decisão nova, então avançam sozinhas. Para quando um boss vence
// o herói, até ele passar de um boss por conta própria.
export function isClimbing(state: GameState): boolean {
  return state.stage < state.record && !state.climbPaused;
}

// Zona da subida: a primeira de CONFIG.zones (a mais rica) cujo boss do próximo
// bloco cai no tempo com o dps atual.
export function climbZone(state: GameState): ZoneId {
  const bossStage = state.stage + CONFIG.bossEvery;
  return ZONE_IDS.find(z => enemyMaxHp(bossStage, z) / dps(state) <= bossTimeout(z)) ?? 'ravine';
}

export function autoAdvance(state: GameState): GameState | null {
  if (!isClimbing(state)) return null;
  return advance(state, isBoss(state.stage) ? climbZone(state) : undefined);
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

// Converte as almas da run: zera fase, ouro, upgrades e zona; mantém almas e recorde.
// Sem alma nova na run não há o que prestigiar.
export function prestige(state: GameState): GameState | null {
  if (state.pendingSouls <= 0) return null;
  return newGame(state.souls + state.pendingSouls, state.record);
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
