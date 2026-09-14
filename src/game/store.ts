// Estado do app em Zustand. Toda a regra fica no motor; aqui só guardamos o
// GameState e contamos os eventos que a tela precisa animar.
import { create } from 'zustand';

import { advance, newGame, tick } from '../engine/engine';
import type { GameState } from '../engine/engine';

interface GameStore {
  game: GameState;
  kills: number;     // kills desde que o app abriu — troca a key do inimigo pra animar a entrada
  bossFails: number; // bosses que fugiram — dispara o aviso de volta de fase
  step: (ticks: number) => void;
  advance: () => void;
}

export const useGame = create<GameStore>()((set, get) => ({
  game: newGame(),
  kills: 0,
  bossFails: 0,

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
}));

// Só em desenvolvimento: `soulgrind.getState()` / `setState()` no console do navegador.
if (__DEV__) (globalThis as { soulgrind?: typeof useGame }).soulgrind = useGame;
