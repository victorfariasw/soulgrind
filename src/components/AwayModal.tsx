import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Coins, Moon } from 'lucide-react-native';

import { CONFIG } from '../engine/engine';
import { formatDuration, formatNumber } from '../engine/format';
import { useGame } from '../game/store';
import { t } from '../strings';
import { colors } from '../theme';

// "You were away 3h12m. Your hero gathered 4.2K gold." — o motivo pra pessoa
// reabrir o app. O ouro já entrou ao voltar; o botão só fecha o aviso.
export function AwayModal() {
  const report = useGame(s => s.awayReport);
  const dismiss = useGame(s => s.dismissAwayReport);
  if (!report) return null;

  const capped = report.seconds >= CONFIG.offlineMaxSeconds;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card} accessibilityRole="alert">
        <Moon size={40} color={colors.souls} strokeWidth={1.5} />
        <Text style={styles.away}>{t.awayFor(formatDuration(report.seconds))}</Text>
        <Text style={styles.gathered}>{t.heroGathered}</Text>
        <View style={styles.goldRow} accessibilityLabel={`${formatNumber(report.gold)} ${t.gold}`}>
          <Coins size={28} color={colors.gold} />
          <Text style={styles.gold}>{formatNumber(report.gold)}</Text>
        </View>
        {capped && <Text style={styles.cap}>{t.offlineCap(CONFIG.offlineMaxSeconds / 3600)}</Text>}
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>{t.collect}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center', justifyContent: 'center', padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  card: {
    width: '100%', maxWidth: 360, alignItems: 'center', gap: 8, padding: 24,
    backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
  },
  away: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  gathered: { color: colors.muted, fontSize: 15 },
  goldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  gold: { color: colors.gold, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cap: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  button: {
    alignSelf: 'stretch', alignItems: 'center', marginTop: 8, paddingVertical: 14,
    borderRadius: 12, backgroundColor: colors.gold,
  },
  pressed: { opacity: 0.8 },
  buttonText: { color: colors.bg, fontSize: 17, fontWeight: '800' },
});
