import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { AppStateStatus } from 'react-native';

// No começo o estado pode vir como "unknown"; só "background"/"inactive" contam como fora.
const isActive = (state: AppStateStatus) => state !== 'background' && state !== 'inactive';

// Se o app está em primeiro plano. O loop de jogo para fora dele: o tempo fora
// é creditado de uma vez pelo progresso offline, sem contar duas vezes.
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => isActive(AppState.currentState));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(isActive(state)));
    return () => subscription.remove();
  }, []);

  return active;
}
