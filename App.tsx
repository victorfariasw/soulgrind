import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AwayModal } from './src/components/AwayModal';
import { TabBar } from './src/components/TabBar';
import type { Tab } from './src/components/TabBar';
import { TopBar } from './src/components/TopBar';
import { usePersistence } from './src/game/persistence';
import { useAppActive } from './src/game/useAppActive';
import { useGameLoop } from './src/game/useGameLoop';
import { CombatScreen } from './src/screens/CombatScreen';
import { UpgradesScreen } from './src/screens/UpgradesScreen';
import { colors } from './src/theme';

export default function App() {
  const ready = usePersistence();
  const active = useAppActive();
  // Fora do app o loop para; o tempo fora vira progresso offline ao voltar.
  useGameLoop(ready && active);
  const [tab, setTab] = useState<Tab>('combat');

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.screen}>
        {/* Até o save ser lido não há o que mostrar — leva milissegundos. */}
        {ready && (
          <>
            <TopBar />
            {tab === 'combat' ? <CombatScreen /> : <UpgradesScreen />}
            <TabBar tab={tab} onChange={setTab} />
            <AwayModal />
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});
