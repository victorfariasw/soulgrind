// Save local: um único JSON. Puro — ler e gravar no disco fica em src/game/persistence.ts.
import { CONFIG, UPGRADE_IDS, ZONE_IDS, enemyMaxHp } from './engine.ts';
import type { GameState, UpgradeId, ZoneId } from './engine.ts';

// Suba a versão ao mudar o formato e converta a anterior em parseSave.
export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  savedAt: number; // ms desde 1970 — base do progresso offline (marco 6)
  game: Omit<GameState, 'enemyHp' | 'bossTimeLeft'>;
}

export function serializeSave(state: GameState, now: number): string {
  const file: SaveFile = {
    version: SAVE_VERSION,
    savedAt: now,
    game: {
      stage: state.stage,
      highestStage: state.highestStage,
      highestCleared: state.highestCleared,
      gold: state.gold,
      souls: state.souls,
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
  if (!isRecord(data) || data.version !== SAVE_VERSION) return null;
  const { savedAt, game } = data;
  if (!isAmount(savedAt) || !isRecord(game)) return null;

  const { stage, highestStage, highestCleared, gold, souls, zone, levels } = game;
  if (!isCount(stage) || stage < 1) return null;
  if (!isCount(highestStage) || highestStage < stage) return null;
  if (!isCount(highestCleared) || highestCleared < stage - 1 || highestCleared > highestStage) return null;
  if (!isAmount(gold) || !isCount(souls)) return null;
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
      stage, highestStage, highestCleared, gold, souls,
      zone: validZone,
      levels: parsedLevels,
      enemyHp: enemyMaxHp(stage, validZone),
      bossTimeLeft: CONFIG.bossTimeout,
    },
  };
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
