import { useEffect } from 'react';

import { CONFIG } from '../engine/engine';
import { useGame } from './store';

// Tick fixo de 100ms, nunca por frame. O setInterval atrasa quando a thread JS
// está ocupada, então medimos o tempo real e rodamos os ticks que couberem.
// Atraso acima de 1s (app em segundo plano) é descartado: isso é trabalho do
// progresso offline (marco 6).
const MAX_TICKS_PER_STEP = 10;

// `enabled` fica falso até o save ser lido, pra não jogar em cima de um estado
// que vai ser substituído.
export function useGameLoop(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const tickMs = CONFIG.tickSeconds * 1000;
    let last = Date.now();
    let pending = 0;

    const id = setInterval(() => {
      const now = Date.now();
      pending += now - last;
      last = now;
      const ticks = Math.floor(pending / tickMs);
      if (ticks === 0) return;
      pending -= ticks * tickMs;
      useGame.getState().step(Math.min(ticks, MAX_TICKS_PER_STEP));
    }, tickMs);

    return () => clearInterval(id);
  }, [enabled]);
}
