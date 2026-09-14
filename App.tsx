import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useGameLoop } from './src/game/useGameLoop';
import { CombatScreen } from './src/screens/CombatScreen';

export default function App() {
  useGameLoop();

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <CombatScreen />
    </SafeAreaProvider>
  );
}
