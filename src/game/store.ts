// Estado do app em Zustand. Toda a regra fica no motor; aqui só guardamos o
// GameState e contamos os eventos que a tela precisa animar.
import { create } from 'zustand';

import { advance, buy, newGame, tick } from '../engine/engine';
import type { GameState, UpgradeId } from '../engine/engine';

interface GameStore {
  game: GameState;
  hydrated: boolean; // save local já lido — o loop e a tela só começam depois disso
  kills: number;     // kills desde que o app abriu — troca a key do inimigo pra animar a entrada
  bossFails: number; // bosses que fugiram — dispara o aviso de volta de fase
  hydrate: (saved: GameState | null) => void;
  step: (ticks: number) => void;
  advance: () => void;
  buy: (id: UpgradeId, count: number) => void;
}

export const useGame = create<GameStore>()((set, get) => ({
  game: newGame(),
  hydrated: false,
  kills: 0,
  bossFails: 0,

  hydrate: saved => set({ game: saved ?? newGame(), hydrated: true }),

  step: ticks => {
    let { game, kills, bossFails } = get();
    for (let i = 0; i < ticks; i++) {
      const r = tick(game);
      game = r.state;
      if (r.killed) kills++;
      if (r.bossFailed) bossFails++;
    }
    set({ game, kills, bossFails });
  },

  advance: () => {
    const { game } = get();
    // O marco 5 troca isso pela tela de zona (3 cartas). Até lá a zona se mantém.
    const next = advance(game, game.zone);
    if (next) set({ game: next });
  },

  buy: (id, count) => {
    const next = buy(get().game, id, count);
    if (next) set({ game: next });
  },
}));

// Só em desenvolvimento: `soulgrind.getState()` / `setState()` no console do navegador.
if (__DEV__) (globalThis as { soulgrind?: typeof useGame }).soulgrind = useGame;
