// Lê e grava o save no AsyncStorage e aplica o tempo fora do app.
// Formato e validação ficam no motor (src/engine/save.ts).
import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseSave, serializeSave } from '../engine/save';
import { useGame } from './store';

const SAVE_KEY = 'soulgrind.save';
const SAVE_INTERVAL_MS = 10_000;

async function load(): Promise<void> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(SAVE_KEY);
  } catch (e) {
    console.warn('Could not read save', e);
  }
  const parsed = raw ? parseSave(raw) : null;
  if (raw && !parsed) console.warn('Save discarded: invalid format');

  const store = useGame.getState();
  store.hydrate(parsed?.game ?? null);
  if (parsed) {
    store.returnFromAway((Date.now() - parsed.savedAt) / 1000);
    // Grava já: fechar o app antes do próximo save daria o mesmo ganho de novo.
    save();
  }
}

function save(): void {
  const { game, hydrated } = useGame.getState();
  // Nunca grava antes de ler: sobrescreveria o save com um jogo novo.
  if (!hydrated) return;
  AsyncStorage.setItem(SAVE_KEY, serializeSave(game, Date.now())).catch(e => console.warn('Could not write save', e));
}

// Carrega o save uma vez; depois grava a cada 10s e sempre que o app perde o foco.
// Ao voltar do segundo plano, credita o tempo fora (o loop fica parado nesse meio-tempo).
// Retorna true quando o jogo já pode começar.
export function usePersistence(): boolean {
  const hydrated = useGame(s => s.hydrated);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let leftAt: number | null = null;
    const id = setInterval(save, SAVE_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (leftAt === null) return;
        useGame.getState().returnFromAway((Date.now() - leftAt) / 1000);
        leftAt = null;
        save();
      } else if (leftAt === null) {
        leftAt = Date.now();
        save();
      }
    });
    return () => {
      clearInterval(id);
      subscription.remove();
    };
  }, [hydrated]);

  return hydrated;
}
