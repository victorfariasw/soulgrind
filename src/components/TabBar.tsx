import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronsUp, Ghost, Swords } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { t } from '../strings';
import { colors } from '../theme';

export type Tab = 'combat' | 'upgrades' | 'prestige';

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'combat', label: t.combat, Icon: Swords },
  { id: 'upgrades', label: t.upgrades, Icon: ChevronsUp },
  { id: 'prestige', label: t.prestige, Icon: Ghost },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {TABS.map(({ id, label, Icon }) => {
        const selected = id === tab;
        const color = selected ? colors.gold : colors.muted;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={styles.tab}
          >
            <Icon size={22} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10 },
  label: { fontSize: 12, fontWeight: '600' },
});
