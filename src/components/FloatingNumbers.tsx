import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { formatNumber } from '../engine/format';
import { colors } from '../theme';

export interface Hit {
  id: number;
  value: number;
  crit: boolean;
  color: string; // cor da arma atual (seção 5.3); crítico usa a cor própria
  offsetX: number;
}

const DURATION_MS = 800;
const RISE_PX = 56;

export function FloatingNumbers({ hits }: { hits: Hit[] }) {
  return (
    <View style={styles.layer}>
      {hits.map(hit => <FloatingNumber key={hit.id} hit={hit} />)}
    </View>
  );
}

// Sobe e some. Quem sai da lista é desmontado pelo pai, então não há timer aqui.
function FloatingNumber({ hit }: { hit: Hit }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.quad) });
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateX: hit.offsetX }, { translateY: -RISE_PX * progress.value }],
  }));

  return (
    <Animated.Text style={[styles.number, { color: hit.color }, hit.crit && styles.crit, style]}>
      {formatNumber(hit.value)}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
  },
  number: { position: 'absolute', fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  crit: { color: colors.crit, fontSize: 24, fontWeight: '800' },
});
