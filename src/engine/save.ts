// Save local: um único JSON. Puro — ler e gravar no disco fica em src/game/persistence.ts.
import { CONFIG, UPGRADE_IDS, ZONE_IDS, enemyMaxHp } from './engine.ts';
import type { GameState, UpgradeId, ZoneId } from './engine.ts';

// Suba a versão ao mudar o formato e converta a anterior em parseSave.
// v2 (marco 7): sai highestStage, entram record e pendingSouls.
export const SAVE_VERSION = 2;

export interface SaveFile {
  version: number;
  savedAt: number; // ms desde 1970 — base do progresso offline
  game: Omit<GameState, 'enemyHp' | 'bossTimeLeft' | 'climbPaused'>;
}

export function serializeSave(state: GameState, now: number): string {
  const file: SaveFile = {
    version: SAVE_VERSION,
    savedAt: now,
    game: {
      stage: state.stage,
      highestCleared: state.highestCleared,
      record: state.record,
      gold: state.gold,
      souls: state.souls,
      pendingSouls: state.pendingSouls,
      zone: state.zone,
      levels: state.levels,
    },
  };
  return JSON.stringify(file);
}

// Save corrompido ou de formato desconhecido vira null: o app começa do zero em
// vez de rodar com números inválidos. O inimigo sempre volta com vida e tempo cheios.
export function parseSave(json: string): { game: GameState; savedAt: number } | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(data) || (data.version !== 1 && data.version !== SAVE_VERSION)) return null;
  const { savedAt } = data;
  const game = data.version === 1 ? migrateV1(data.game) : data.game;
  if (!isAmount(savedAt) || !isRecord(game)) return null;

  const { stage, highestCleared, record, gold, souls, pendingSouls, zone, levels } = game;
  if (!isCount(stage) || stage < 1) return null;
  if (!isCount(highestCleared) || highestCleared < stage - 1) return null;
  // O recorde é um boss e nunca fica abaixo do último boss vencido nesta run.
  if (!isCount(record) || record % CONFIG.bossEvery !== 0 || record < lastBossUpTo(highestCleared)) return null;
  if (!isAmount(gold) || !isCount(souls) || !isCount(pendingSouls)) return null;
  if (typeof zone !== 'string' || !(ZONE_IDS as string[]).includes(zone)) return null;
  if (!isRecord(levels)) return null;

  const parsedLevels = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) {
    const level = levels[id] ?? 0; // upgrade que não existia quando o save foi feito
    if (!isCount(level) || level > CONFIG.upgrades[id].maxLevel) return null;
    parsedLevels[id] = level;
  }

  const validZone = zone as ZoneId;
  return {
    savedAt,
    game: {
      stage, highestCleared, record, gold, souls, pendingSouls,
      zone: validZone,
      levels: parsedLevels,
      enemyHp: enemyMaxHp(stage, validZone),
      bossTimeLeft: CONFIG.zones[validZone].bossTimeout,
      climbPaused: false,
    },
  };
}

// v1 não tinha prestígio: o recorde é o último boss vencido na run, e as almas
// desses bosses (a partir da fase 30) ficam pendentes. Almas antigas não valem —
// eram de outra fórmula e nunca foram usadas.
function migrateV1(game: unknown): unknown {
  if (!isRecord(game) || !isCount(game.highestCleared)) return null;
  const record = lastBossUpTo(game.highestCleared);
  const firstSoulBoss = Math.ceil(CONFIG.prestigeMinStage / CONFIG.bossEvery);
  const pendingSouls = Math.max(0, record / CONFIG.bossEvery - firstSoulBoss + 1);
  return { ...game, record, souls: 0, pendingSouls };
}

function lastBossUpTo(stage: number): number {
  return Math.floor(stage / CONFIG.bossEvery) * CONFIG.bossEvery;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Número finito e não negativo. Infinity vira null no JSON e cai aqui.
function isAmount(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function isCount(v: unknown): v is number {
  return isAmount(v) && Number.isInteger(v);
}
