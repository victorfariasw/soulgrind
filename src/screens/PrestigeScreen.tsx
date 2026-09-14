import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ghost, RotateCcw } from 'lucide-react-native';

import { CONFIG, nextSoulStage, soulMultiplier } from '../engine/engine';
import { formatNumber } from '../engine/format';
import { useGame } from '../game/store';
import { t } from '../strings';
import { colors } from '../theme';

// Quantas almas a run rendeu, o que elas fazem e o botão de prestígio com confirmação.
export function PrestigeScreen({ onPrestiged }: { onPrestiged: () => void }) {
  const souls = useGame(s => s.game.souls);
  const pending = useGame(s => s.game.pendingSouls);
  const record = useGame(s => s.game.record);
  const prestige = useGame(s => s.prestige);
  const [confirming, setConfirming] = useState(false);

  const canPrestige = pending > 0;
  const damageNow = `×${formatNumber(soulMultiplier({ souls }), 2)}`;
  const damageAfter = `×${formatNumber(soulMultiplier({ souls: souls + pending }), 2)}`;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Ghost size={48} color={colors.souls} strokeWidth={1.5} />
        <Text style={styles.pending}>+{pending}</Text>
        <Text style={styles.pendingLabel}>{t.soulsThisRun}</Text>
      </View>

      <View style={styles.card}>
        <Row label={t.souls} value={canPrestige ? `${souls} → ${souls + pending}` : String(souls)} />
        <Row label={t.damageFromSouls} value={canPrestige ? `${damageNow} → ${damageAfter}` : damageNow} highlight={canPrestige} />
        <Row label={t.record} value={`${t.stage} ${record}`} />
      </View>

      <Text style={styles.explain}>{t.prestigeRules(CONFIG.soulDamageMult, CONFIG.prestigeMinStage)}</Text>
      <Text style={styles.explain}>{t.prestigeResets}</Text>

      {confirming ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>{t.prestigeConfirm}</Text>
          <View style={styles.buttons}>
            <Pressable
              onPress={() => setConfirming(false)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>{t.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                prestige();
                setConfirming(false);
                onPrestiged();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>{t.startOver}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setConfirming(true)}
          disabled={!canPrestige}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPrestige }}
          style={({ pressed }) => [styles.button, styles.primary, !canPrestige && styles.disabled, pressed && styles.pressed]}
        >
          <RotateCcw size={18} color={canPrestige ? colors.bg : colors.muted} />
          <Text style={[styles.primaryText, !canPrestige && styles.disabledText]}>{t.prestige}</Text>
        </Pressable>
      )}
      {!canPrestige && <Text style={styles.hint}>{t.prestigeLocked(nextSoulStage(record))}</Text>}
    </ScrollView>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14 },

  hero: { alignItems: 'center', paddingVertical: 8 },
  pending: { color: colors.souls, fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 4 },
  pendingLabel: { color: colors.muted, fontSize: 14 },

  card: {
    gap: 10, padding: 14,
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  rowHighlight: { color: colors.souls },

  explain: { color: colors.muted, fontSize: 13, lineHeight: 19 },

  confirm: {
    gap: 12, padding: 14,
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.souls,
  },
  confirmText: { color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10 },

  button: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  primary: { backgroundColor: colors.souls, borderColor: colors.souls },
  primaryText: { color: colors.bg, fontSize: 16, fontWeight: '800' },
  secondary: { backgroundColor: colors.bg, borderColor: colors.border },
  secondaryText: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  disabled: { backgroundColor: colors.surface, borderColor: colors.border },
  disabledText: { color: colors.muted },
  pressed: { opacity: 0.8 },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
