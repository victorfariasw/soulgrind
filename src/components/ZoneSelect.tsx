import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Castle, Landmark, Mountain } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { CONFIG, ZONE_IDS, bossTimeout, dps, enemyMaxHp } from '../engine/engine';
import type { ZoneId } from '../engine/engine';
import { useGame } from '../game/store';
import { t } from '../strings';
import { colors, zoneColors } from '../theme';

const ICONS: Record<ZoneId, LucideIcon> = { ruins: Castle, catacombs: Landmark, ravine: Mountain };

// Catacombs é a referência: o que for melhor que ela aparece em verde, o que for pior em vermelho.
const NEUTRAL = CONFIG.zones.catacombs;

type Tone = 'good' | 'bad' | 'neutral';
const TONE_COLORS: Record<Tone, string> = { good: colors.good, bad: colors.boss, neutral: colors.text };

function tone(value: number, neutral: number, better: 'higher' | 'lower'): Tone {
  if (value === neutral) return 'neutral';
  return (value > neutral) === (better === 'higher') ? 'good' : 'bad';
}

// Segundos até 99, pra comparar direto com o limite da zona ("79s / 30s").
function formatSeconds(seconds: number): string {
  if (seconds <= 99) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return '1h+';
}

interface Props {
  onChoose: (zone: ZoneId) => void;
  onClose: () => void;
}

// Aparece depois de vencer um boss, quando o jogador aperta Advance.
export function ZoneSelect({ onChoose, onClose }: Props) {
  const stage = useGame(s => s.game.stage); // o boss que acabou de cair
  const first = stage + 1;
  const nextBoss = stage + CONFIG.bossEvery;

  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.nextZone}</Text>
        <Text style={styles.subtitle}>{t.stages(first, nextBoss)}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.cards}>
        {ZONE_IDS.map(zone => (
          <ZoneCard key={zone} zone={zone} bossStage={nextBoss} onPress={() => onChoose(zone)} />
        ))}
      </ScrollView>
      <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
        <Text style={styles.closeText}>{t.keepFarming}</Text>
      </Pressable>
    </View>
  );
}

function ZoneCard({ zone, bossStage, onPress }: { zone: ZoneId; bossStage: number; onPress: () => void }) {
  const z = CONFIG.zones[zone];
  const Icon = ICONS[zone];
  const color = zoneColors[zone];
  const limit = bossTimeout(zone);
  // Quanto o boss do bloco levaria com o dps de agora. O herói ainda fica mais
  // forte até lá, então é uma estimativa pessimista — é o que o jogador precisa pra decidir.
  const bossSeconds = useGame(s => enemyMaxHp(bossStage, zone) / dps(s.game));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t.zones[zone]}. ${t.zoneTaglines[zone]}`}
      style={({ pressed }) => [styles.card, { borderColor: color }, pressed && styles.pressed]}
    >
      <View style={styles.cardHeader}>
        <Icon size={28} color={color} />
        <View style={styles.cardTitle}>
          <Text style={[styles.zoneName, { color }]}>{t.zones[zone]}</Text>
          <Text style={styles.tagline}>{t.zoneTaglines[zone]}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Modifier label={t.zoneStats.enemyHp} value={`×${z.hpMult}`} tone={tone(z.hpMult, NEUTRAL.hpMult, 'lower')} />
        <Modifier label={t.zoneStats.gold} value={`×${z.goldMult}`} tone={tone(z.goldMult, NEUTRAL.goldMult, 'higher')} />
        <Modifier label={t.zoneStats.bossHp} value={`×${z.bossHpMult}`} tone={tone(z.bossHpMult, NEUTRAL.bossHpMult, 'lower')} />
        <Modifier label={t.zoneStats.bossTimer} value={`${z.bossTimeout}s`} tone={tone(z.bossTimeout, NEUTRAL.bossTimeout, 'higher')} />
      </View>

      <Text style={styles.estimate}>
        {t.bossAtYourDps(bossStage)}{' '}
        <Text style={{ color: bossSeconds <= limit ? colors.good : colors.boss }}>
          {formatSeconds(bossSeconds)} / {limit}s
        </Text>
      </Text>
    </Pressable>
  );
}

function Modifier({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <View style={styles.modifier}>
      <Text style={styles.modifierLabel}>{label}</Text>
      <Text style={[styles.modifierValue, { color: TONE_COLORS[tone] }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: colors.bg, paddingBottom: 12,
  },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 2 },
  cards: { paddingHorizontal: 12, paddingVertical: 8, gap: 10 },

  card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 2, padding: 12, gap: 10 },
  pressed: { opacity: 0.8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { flex: 1 },
  zoneName: { fontSize: 18, fontWeight: '800' },
  tagline: { color: colors.muted, fontSize: 13 },

  stats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  modifier: { width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingRight: 12 },
  modifierLabel: { color: colors.muted, fontSize: 13 },
  modifierValue: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },

  estimate: { color: colors.muted, fontSize: 13, fontVariant: ['tabular-nums'] },

  close: {
    marginHorizontal: 16, marginTop: 8, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  closeText: { color: colors.muted, fontSize: 15, fontWeight: '700' },
});
