import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { ChevronsRight, Shield } from 'lucide-react-native';

import { WEAPON_ICON_COMPONENTS } from '../components/contentIcons';
import { EnemyCard } from '../components/EnemyCard';
import { FloatingNumbers } from '../components/FloatingNumbers';
import type { Hit } from '../components/FloatingNumbers';
import { ZoneSelect } from '../components/ZoneSelect';
import { WEAPONS, weaponIndexFor, weaponName } from '../content/weapons';
import {
  CONFIG, attacksPerSecond, canAdvance, critChance, critMultiplier, dps, goldPerSecond, hitDamage, isBoss, isClimbing,
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
const WEAPON_NAME_MS = 2000;

export function CombatScreen() {
  const shake = useSharedValue(0);
  const hits = useHitFeed(shake);
  const [choosingZone, setChoosingZone] = useState(false);
  const advance = useGame(s => s.advance);

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
      <AdvanceButton onChooseZone={() => setChoosingZone(true)} />
      <Footer />
      {/* O combate continua por baixo enquanto o jogador decide. */}
      {choosingZone && (
        <ZoneSelect
          onChoose={zone => {
            advance(zone);
            setChoosingZone(false);
          }}
          onClose={() => setChoosingZone(false)}
        />
      )}
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
        color: WEAPONS[weaponIndexFor(game.levels.attack)].color,
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

// Herói + arma atual. Arma nova: o ícone pulsa e o nome aparece por 2 segundos,
// sem modal (seção 5.3). Arma pior (o prestígio zera o Attack) troca em silêncio.
function HeroCard() {
  const attack = useGame(s => s.game.levels.attack);
  const weaponSeen = useGame(s => s.weaponSeen);
  const markWeaponSeen = useGame(s => s.markWeaponSeen);
  const [showName, setShowName] = useState(false);
  const pulse = useSharedValue(1);

  const index = weaponIndexFor(attack);
  const weapon = WEAPONS[index];
  const WeaponIcon = WEAPON_ICON_COMPONENTS[weapon.icon];

  useEffect(() => {
    if (index === weaponSeen) return;
    markWeaponSeen(index);
    if (index < weaponSeen) return;
    pulse.value = withSequence(withTiming(1.4, { duration: 150 }), withTiming(1, { duration: 300 }));
    setShowName(true);
  }, [index, weaponSeen, markWeaponSeen, pulse]);

  // Duas armas seguidas (compra ×10) reiniciam a contagem com o nome da mais nova.
  useEffect(() => {
    if (!showName) return;
    const id = setTimeout(() => setShowName(false), WEAPON_NAME_MS);
    return () => clearTimeout(id);
  }, [showName, index]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroIcons}>
        <Shield size={48} color={colors.text} strokeWidth={1.5} />
        <Animated.View style={pulseStyle}>
          <WeaponIcon size={26} color={weapon.color} strokeWidth={2} />
        </Animated.View>
      </View>
      <Text style={styles.name}>{t.hero}</Text>
      {/* Espaço sempre reservado, pra o card não mudar de tamanho quando o nome aparece. */}
      <Text style={[styles.weaponName, { color: weapon.color, opacity: showName ? 1 : 0 }]} numberOfLines={2}>
        {weaponName(weapon)}
      </Text>
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

function AdvanceButton({ onChooseZone }: { onChooseZone: () => void }) {
  const stage = useGame(s => s.game.stage);
  const record = useGame(s => s.game.record);
  const canGo = useGame(s => canAdvance(s.game));
  const climbing = useGame(s => isClimbing(s.game));
  const onAdvance = useGame(s => s.advance);
  const next = stage + 1;
  // Depois de vencer o boss, avançar passa pela escolha da próxima zona.
  const leavingBoss = isBoss(stage);
  // Na subida automática o botão só informa até onde o herói vai sozinho.
  const enabled = canGo && !climbing;
  const textColor = enabled ? colors.bg : colors.muted;

  let label: string = t.advance;
  let detail = `${t.stage} ${next}${isBoss(next) ? ` · ${t.boss}` : ''}`;
  if (climbing) {
    label = t.climbing;
    detail = t.toStage(record);
  } else if (leavingBoss) {
    label = t.chooseZone;
    detail = t.stages(next, stage + CONFIG.bossEvery);
  }

  return (
    <Pressable
      onPress={leavingBoss ? onChooseZone : () => onAdvance()}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [styles.advance, !enabled && styles.advanceDisabled, pressed && styles.advancePressed]}
    >
      <Text style={[styles.advanceText, { color: textColor }]}>{label}</Text>
      <Text style={[styles.advanceSub, { color: textColor }]}>{detail}</Text>
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
  weaponName: { fontSize: 13, fontWeight: '700', textAlign: 'center', minHeight: 34 },
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
