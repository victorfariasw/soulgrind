import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useGame } from './store';

// Haptic só no que dá peso (seção 6): boss vencido pela primeira vez e boss que
// fugiu. Bosses abaixo do recorde não vibram — na subida automática seriam vários
// por segundo.
export function useHaptics(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    return useGame.subscribe((state, prev) => {
      if (state.newRecords > prev.newRecords) vibrate(Haptics.NotificationFeedbackType.Success);
      if (state.bossFails > prev.bossFails) vibrate(Haptics.NotificationFeedbackType.Warning);
    });
  }, []);
}

// Aparelho sem motor de vibração só ignora.
function vibrate(type: Haptics.NotificationFeedbackType): void {
  Haptics.notificationAsync(type).catch(() => {});
}
