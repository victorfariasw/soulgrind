import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Skull } from 'lucide-react-native';

import { bossTimeout, dps, enemyMaxHp, isBoss } from '../engine/engine';
import { formatNumber } from '../engine/format';
import { useGame } from '../game/store';
import { t } from '../strings';
import { colors } from '../theme';
import { HealthBar } from './HealthBar';

// Abaixo disso o inimigo troca rápido demais pra animar a entrada. Nas fases
// altas o herói mata vários por segundo e animar cada morte trava a UI.
const FAST_KILL_SECONDS = 0.5;
const ENTRY_MS = 150;

export function EnemyCard({ shake }: { shake: SharedValue<number> }) {
  const stage = useGame(s => s.game.stage);
  const zone = useGame(s => s.game.zone);
  const hp = useGame(s => s.game.enemyHp);
  const bossTimeLeft = useGame(s => s.game.bossTimeLeft);
  const kills = useGame(s => s.kills);
  const fastKills = useGame(s => enemyMaxHp(s.game.stage, s.game.zone) / dps(s.game) < FAST_KILL_SECONDS);

  const boss = isBoss(stage);
  const maxHp = enemyMaxHp(stage, zone);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <Animated.View style={[styles.card, boss && styles.bossCard, shakeStyle]}>
      {/* A key nova remonta o corpo: próximo inimigo entra pela direita com a vida cheia. */}
      <Animated.View
        key={fastKills ? 'fast' : kills}
        entering={fastKills ? undefined : FadeInRight.duration(ENTRY_MS)}
        style={styles.body}
      >
        <Skull size={boss ? 60 : 48} color={boss ? colors.boss : colors.text} strokeWidth={1.5} />
        <Text style={[styles.name, boss && styles.bossName]}>{boss ? t.boss : t.enemy}</Text>
        <HealthBar fraction={hp / maxHp} color={colors.hp} />
        <Text style={styles.hpText}>{formatNumber(hp)} / {formatNumber(maxHp)}</Text>
        {boss && (
          <View style={styles.timer}>
            <HealthBar fraction={bossTimeLeft / bossTimeout(zone)} color={colors.boss} height={4} />
            <Text style={styles.timerText}>{Math.ceil(bossTimeLeft)}s</Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 2, borderColor: colors.border, padding: 12,
  },
  bossCard: { borderColor: colors.boss },
  body: { alignItems: 'center', gap: 8 },
  name: { color: colors.muted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  bossName: { color: colors.boss },
  hpText: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  timer: { width: '100%', gap: 4, alignItems: 'center' },
  timerText: { color: colors.boss, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
