import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Coins, Ghost } from 'lucide-react-native';

import { formatNumber } from '../engine/format';
import { useGame } from '../game/store';
import { t } from '../strings';
import { colors, zoneColors } from '../theme';

export function TopBar() {
  const gold = useGame(s => s.game.gold);
  const souls = useGame(s => s.game.souls);
  const stage = useGame(s => s.game.stage);
  const zone = useGame(s => s.game.zone);

  return (
    <View style={styles.bar}>
      <Stat icon={<Coins size={18} color={colors.gold} />} value={formatNumber(gold)} color={colors.gold} label={t.gold} />
      <Stat icon={<Ghost size={18} color={colors.souls} />} value={formatNumber(souls)} color={colors.souls} label={t.souls} />
      <View style={styles.stageBox}>
        <Text style={styles.stageText}>{t.stage} {stage}</Text>
        <Text style={[styles.zoneText, { color: zoneColors[zone] }]}>{t.zones[zone]}</Text>
      </View>
    </View>
  );
}

function Stat({ icon, value, color, label }: { icon: ReactNode; value: string; color: string; label: string }) {
  return (
    <View style={styles.stat} accessibilityLabel={`${label} ${value}`}>
      {icon}
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  stageBox: { marginLeft: 'auto', alignItems: 'flex-end' },
  stageText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  zoneText: { fontSize: 12, fontWeight: '600' },
});
