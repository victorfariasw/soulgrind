import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Coins, Crosshair, Flame, Sword, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import {
  CONFIG, UPGRADE_IDS, attacksPerSecond, bulkCost, critChance, critMultiplier, goldMultiplier, hitDamage,
} from '../engine/engine';
import type { Stats, UpgradeId } from '../engine/engine';
import { formatNumber } from '../engine/format';
import { useGame } from '../game/store';
import { t } from '../strings';
import { colors } from '../theme';

const BULK = 10;

// O efeito atual e o do próximo nível saem das mesmas funções que o motor usa
// no combate, então a tela nunca promete um número diferente do real.
const UPGRADES: Record<UpgradeId, { Icon: LucideIcon; stat: (s: Stats) => number; format: (v: number) => string }> = {
  attack:     { Icon: Sword,     stat: hitDamage,        format: v => formatNumber(v, 2) },
  speed:      { Icon: Zap,       stat: attacksPerSecond, format: v => `${v.toFixed(2)}/s` },
  critChance: { Icon: Crosshair, stat: critChance,       format: v => `${Math.round(v * 100)}%` },
  critDamage: { Icon: Flame,     stat: critMultiplier,   format: v => `×${v.toFixed(2)}` },
  greed:      { Icon: Coins,     stat: goldMultiplier,   format: v => `+${Math.round((v - 1) * 100)}%` },
};

export function UpgradesScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.list}>
      {UPGRADE_IDS.map(id => <UpgradeRow key={id} id={id} />)}
    </ScrollView>
  );
}

function UpgradeRow({ id }: { id: UpgradeId }) {
  // `levels` só troca de referência numa compra, não a cada tick.
  const levels = useGame(s => s.game.levels);
  const souls = useGame(s => s.game.souls);
  const { Icon, stat, format } = UPGRADES[id];
  const level = levels[id];
  const remaining = CONFIG.upgrades[id].maxLevel - level;
  const now = format(stat({ levels, souls }));
  const next = format(stat({ levels: { ...levels, [id]: level + 1 }, souls }));

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Icon size={22} color={colors.gold} />
        <Text style={styles.name}>{t.upgradeNames[id]}</Text>
        <Text style={styles.level}>{t.level} {level}</Text>
      </View>
      <Text style={styles.effect}>
        {t.upgradeEffects[id]} <Text style={styles.effectValue}>{now}</Text>
        {remaining > 0 && <> → <Text style={styles.effectNext}>{next}</Text></>}
      </Text>
      {remaining > 0 ? (
        <View style={styles.buttons}>
          <BuyButton id={id} level={level} count={1} />
          {remaining > 1 && <BuyButton id={id} level={level} count={Math.min(BULK, remaining)} />}
        </View>
      ) : (
        <Text style={styles.max}>{t.max}</Text>
      )}
    </View>
  );
}

function BuyButton({ id, level, count }: { id: UpgradeId; level: number; count: number }) {
  const cost = bulkCost(id, level, count);
  // Só re-renderiza quando a compra passa a caber (ou deixa de caber) no ouro.
  const affordable = useGame(s => s.game.gold >= cost);
  const onBuy = useGame(s => s.buy);
  // Custo arredondado pra cima: com 5 de ouro, um custo de 5.4 não pode aparecer como "5".
  const costText = formatNumber(Math.ceil(cost));
  const textColor = affordable ? colors.bg : colors.muted;

  return (
    <Pressable
      onPress={() => onBuy(id, count)}
      disabled={!affordable}
      accessibilityRole="button"
      accessibilityState={{ disabled: !affordable }}
      accessibilityLabel={`${t.buy} ${count} ${t.upgradeNames[id]}, ${costText} ${t.gold}`}
      style={({ pressed }) => [styles.buy, !affordable && styles.buyDisabled, pressed && styles.buyPressed]}
    >
      <Text style={[styles.buyCount, { color: textColor }]}>×{count}</Text>
      <View style={styles.buyCost}>
        <Coins size={14} color={textColor} />
        <Text style={[styles.buyCostText, { color: textColor }]}>{costText}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 12, gap: 10 },

  row: {
    gap: 8, padding: 12,
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  level: { marginLeft: 'auto', color: colors.muted, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  effect: { color: colors.muted, fontSize: 14 },
  effectValue: { color: colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
  effectNext: { color: colors.gold, fontWeight: '600', fontVariant: ['tabular-nums'] },

  buttons: { flexDirection: 'row', gap: 8 },
  buy: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.gold, borderWidth: 1, borderColor: colors.gold,
  },
  buyDisabled: { backgroundColor: colors.bg, borderColor: colors.border },
  buyPressed: { opacity: 0.8 },
  buyCount: { fontSize: 15, fontWeight: '800' },
  buyCost: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  buyCostText: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  max: { color: colors.gold, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});
