// Estado do app em Zustand. Toda a regra fica no motor; aqui só guardamos o
// GameState e contamos os eventos que a tela precisa animar.
import { create } from 'zustand';

import { weaponIndexFor } from '../content/weapons';
import { advance, applyOffline, autoAdvance, buy, newGame, prestige, tick } from '../engine/engine';
import type { GameState, UpgradeId, ZoneId } from '../engine/engine';

// Ausências menores que isso rendem ouro, mas não abrem o modal — senão ele
// apareceria a cada troca rápida de app.
const MIN_AWAY_REPORT_SECONDS = 60;

interface AwayReport {
  seconds: number;
  gold: number;
}

interface GameStore {
  game: GameState;
  hydrated: boolean;  // save local já lido — o loop e a tela só começam depois disso
  kills: number;      // kills desde que o app abriu — troca a key do inimigo pra animar a entrada
  bossFails: number;  // bosses que fugiram — dispara o aviso de volta de fase e o haptic
  newRecords: number; // bosses vencidos pela primeira vez — dispara o haptic
  weaponSeen: number; // última arma que a tela já mostrou — uma melhor dispara o anúncio
  awayReport: AwayReport | null; // modal "You were away…" pendente
  hydrate: (saved: GameState | null) => void;
  step: (ticks: number) => void;
  // Saindo de um boss, `zone` é obrigatória (vem da tela de 3 cartas).
  advance: (zone?: ZoneId) => void;
  buy: (id: UpgradeId, count: number) => void;
  prestige: () => void;
  markWeaponSeen: (index: number) => void;
  returnFromAway: (awaySeconds: number) => void;
  dismissAwayReport: () => void;
}

export const useGame = create<GameStore>()((set, get) => ({
  game: newGame(),
  hydrated: false,
  kills: 0,
  bossFails: 0,
  newRecords: 0,
  weaponSeen: 0,
  awayReport: null,

  // A arma do save conta como já vista: abrir o app não anuncia nada.
  hydrate: saved => {
    const game = saved ?? newGame();
    set({ game, hydrated: true, weaponSeen: weaponIndexFor(game.levels.attack) });
  },

  step: ticks => {
    let { game, kills, bossFails, newRecords } = get();
    for (let i = 0; i < ticks; i++) {
      const recordBefore = game.record;
      const r = tick(game);
      game = r.state;
      if (game.record > recordBefore) newRecords++;
      if (r.killed) {
        kills++;
        // Abaixo do recorde não há decisão: a subida automática avança sozinha.
        game = autoAdvance(game) ?? game;
      }
      if (r.bossFailed) bossFails++;
    }
    set({ game, kills, bossFails, newRecords });
  },

  advance: zone => {
    const next = advance(get().game, zone);
    if (next) set({ game: next });
  },

  buy: (id, count) => {
    const next = buy(get().game, id, count);
    if (next) set({ game: next });
  },

  prestige: () => {
    const next = prestige(get().game);
    if (next) set({ game: next });
  },

  markWeaponSeen: index => set({ weaponSeen: index }),

  // O ouro entra na hora; o modal é só o aviso.
  returnFromAway: awaySeconds => {
    const { game, awayReport } = get();
    const r = applyOffline(game, awaySeconds);
    const report = r.seconds >= MIN_AWAY_REPORT_SECONDS && r.gold > 0
      // Duas saídas sem fechar o modal somam no mesmo aviso.
      ? { seconds: (awayReport?.seconds ?? 0) + r.seconds, gold: (awayReport?.gold ?? 0) + r.gold }
      : awayReport;
    set({ game: r.state, awayReport: report });
  },

  dismissAwayReport: () => set({ awayReport: null }),
}));

// Só em desenvolvimento: `soulgrind.getState()` / `setState()` no console do navegador.
if (__DEV__) (globalThis as { soulgrind?: typeof useGame }).soulgrind = useGame;
