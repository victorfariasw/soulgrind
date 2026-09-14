import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { CONFIG } from '../engine/engine';
import { colors } from '../theme';

interface Props {
  fraction: number; // 0 a 1
  color: string;
  height?: number;
}

export function HealthBar({ fraction, color, height = 10 }: Props) {
  const width = useSharedValue(fraction);

  useEffect(() => {
    // Desliza durante um tick, até o próximo valor chegar.
    width.value = withTiming(fraction, { duration: CONFIG.tickSeconds * 1000, easing: Easing.linear });
  }, [fraction, width]);

  const fill = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, width.value)) * 100}%` as const,
  }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%' },
});
