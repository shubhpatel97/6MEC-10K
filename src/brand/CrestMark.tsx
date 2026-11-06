import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { WORDMARK } from './wordmark';
import { useReducedMotion } from '../theme/motion';

type Props = {
  height?: number;
  color?: string;
  /** draws the strokes, fills with ink, then settles */
  animate?: boolean;
  onDrawn?: () => void;
  style?: ViewStyle;
  tinted?: boolean;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Small, confident crest wordmark. The animated variant is the coded intro:
 * muted strokes first, black ink fill second, then it holds.
 */
export function CrestMark({
  height = 22,
  color = '#ffffff',
  animate = false,
  onDrawn,
  style,
  tinted = false,
}: Props) {
  const reduced = useReducedMotion();
  const width = useMemo(() => (height / WORDMARK.height) * WORDMARK.width, [height]);

  const progress = useRef(new Animated.Value(animate && !reduced ? 0 : 1)).current;
  const fill = useRef(new Animated.Value(animate && !reduced ? 0 : 1)).current;

  useEffect(() => {
    if (!animate || reduced) return;
    progress.setValue(0);
    fill.setValue(0);
    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(fill, {
        toValue: 1,
        duration: 460,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) onDrawn?.();
    });
  }, [animate, reduced, progress, fill, onDrawn]);

  return (
    <View style={[{ width, height }, style]} accessibilityLabel="crest" accessibilityRole="image">
      <Svg width={width} height={height} viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}>
        {/* muted strokes are drawn first */}
        <G>
          {WORDMARK.letters.map((letter, index) => {
            const start = index * 0.14;
            const end = Math.min(1, start + 0.42);
            return (
              <AnimatedPath
                key={letter.char}
                d={letter.path}
                fill="none"
                stroke={tinted ? letter.tint : color}
                strokeWidth={WORDMARK.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={[220, 220]}
                strokeDashoffset={progress.interpolate({
                  inputRange: [0, start, end, 1],
                  outputRange: [220, 220, 0, 0],
                })}
              />
            );
          })}
        </G>
        {/* then the solid ink fill settles over them */}
        <G>
          {WORDMARK.letters.map((letter) => (
            <AnimatedPath
              key={`fill-${letter.char}`}
              d={letter.path}
              fill="none"
              stroke={color}
              strokeWidth={WORDMARK.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={fill}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

export const crestStyles = StyleSheet.create({
  ghost: { opacity: 0.4 },
});
