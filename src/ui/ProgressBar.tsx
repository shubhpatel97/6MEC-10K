import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { palette } from '../theme/tokens';

type Props = {
  progress: number;
  color?: string;
  track?: string;
  height?: number;
  style?: ViewStyle;
};

/** Flat, sharp progress. Nothing rounded on a commerce surface. */
export function ProgressBar({ progress, color = palette.ink, track = palette.paperDeep, height = 3, style }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { backgroundColor: track, height }, style]}>
      <View style={[styles.fill, { backgroundColor: color, width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
