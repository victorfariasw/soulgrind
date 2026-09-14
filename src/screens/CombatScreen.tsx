import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { ChevronsRight, Shield, Sword } from 'lucide-react-native';

import { EnemyCard } from '../components/EnemyCard';
import { FloatingNumbers } from '../components/FloatingNumbers';
import type { Hit } from '../components/FloatingNumbers';
import {
  attacksPerSecond, canAdvance, critChance, critMultiplier, dps, goldPerSecond, hitDamage, isBoss,
} from '../engine/engine';
import { formatNumber } from '../engine/format';
import { useGame } from '../game/store';
import { t } from '../strings';
import { colors } from '../theme';

// Golpes na tela são cosméticos: o combate usa o dps médio do motor.
// No máximo 5 números por segundo, senão vira ruído quando a velocidade sobe.
const MIN_HIT_INTERVAL_MS = 200;
const MAX_VISIBLE_HITS = 6;
const CRIT_SHAKE_PX = 3;
const NOTICE_MS = 2000;

export function CombatScreen() {
  const shake = useSharedValue(0);
  const hits = useHitFeed(shake);

  return (
    <View style={styles.screen}>
      <View style={styles.arena}>
        <HeroCard />
        <View style={styles.hits}>
          <FloatingNumbers hits={hits} />
        </View>
        <EnemyCard shake={shake} />
      </View>
      <BossNotice />
      <AdvanceButton />
      <Footer />
    </View>
  );
}

function useHitFeed(shake: SharedValue<number>): Hit[] {
  const [hits, setHits] = useState<Hit[]>([]);
  const nextId = useRef(0);
  const aps = useGame(s => attacksPerSecond(s.game));

  useEffect(() => {
    const id = setInterval(() => {
      const { game } = useGame.getState();
      const crit = Math.random() < critChance(game);
      const hit: Hit = {
        id: nextId.current++,
        value: hitDamage(game) * (crit ? critMultiplier(game) : 1),
        crit,
        offsetX: (Math.random() - 0.5) * 36,
      };
      setHits(prev => [...prev.slice(1 - MAX_VISIBLE_HITS), hit]);
      if (crit) {
        shake.value = withSequence(
          withTiming(CRIT_SHAKE_PX, { duration: 40 }),
          withTiming(-CRIT_SHAKE_PX, { duration: 40 }),
          withTiming(0, { duration: 40 }),
        );
      }
    }, Math.max(1000 / aps, MIN_HIT_INTERVAL_MS));

    return () => clearInterval(id);
  }, [aps, shake]);

  return hits;
}

function HeroCard() {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroIcons}>
        <Shield size={48} color={colors.text} strokeWidth={1.5} />
        <Sword size={26} color={colors.weapon} strokeWidth={2} />
      </View>
      <Text style={styles.name}>{t.hero}</Text>
    </View>
  );
}

function BossNotice() {
  const bossFails = useGame(s => s.bossFails);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (bossFails === 0) return;
    setText(t.bossFled(useGame.getState().game.stage));
    const id = setTimeout(() => setText(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [bossFails]);

  // Linha sempre reservada, pra o botão não pular quando o aviso aparece.
  return <Text style={styles.notice}>{text ?? ' '}</Text>;
}

function AdvanceButton() {
  const stage = useGame(s => s.game.stage);
  const enabled = useGame(s => canAdvance(s.game));
  const onAdvance = useGame(s => s.advance);
  const next = stage + 1;
  const textColor = enabled ? colors.bg : colors.muted;

  return (
    <Pressable
      onPress={onAdvance}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [styles.advance, !enabled && styles.advanceDisabled, pressed && styles.advancePressed]}
    >
      <Text style={[styles.advanceText, { color: textColor }]}>{t.advance}</Text>
      <Text style={[styles.advanceSub, { color: textColor }]}>
        {t.stage} {next}{isBoss(next) ? ` · ${t.boss}` : ''}
      </Text>
      <ChevronsRight size={20} color={textColor} />
    </Pressable>
  );
}

function Footer() {
  const currentDps = useGame(s => dps(s.game));
  const gps = useGame(s => goldPerSecond(s.game));

  return (
    <View style={styles.footer}>
      <View>
        <Text style={styles.footerLabel}>{t.dps}</Text>
        <Text style={styles.footerValue}>{formatNumber(currentDps, 1)}</Text>
      </View>
      <View>
        <Text style={styles.footerLabel}>{t.goldPerSecond}</Text>
        <Text style={[styles.footerValue, { color: colors.gold }]}>{formatNumber(gps, 1)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  arena: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  heroCard: {
    flex: 1, alignItems: 'center', gap: 8, padding: 12,
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 2, borderColor: colors.border,
  },
  heroIcons: { flexDirection: 'row', alignItems: 'flex-end' },
  name: { color: colors.muted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  hits: { width: 72, alignSelf: 'stretch' },

  notice: { color: colors.boss, textAlign: 'center', fontSize: 14, marginBottom: 8 },

  advance: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, paddingVertical: 14, borderRadius: 12,
    backgroundColor: colors.gold, borderWidth: 1, borderColor: colors.gold,
  },
  advanceDisabled: { backgroundColor: colors.surface, borderColor: colors.border },
  advancePressed: { opacity: 0.8 },
  advanceText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  advanceSub: { fontSize: 14, fontWeight: '600' },

  footer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, marginTop: 12 },
  footerLabel: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  footerValue: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
});
