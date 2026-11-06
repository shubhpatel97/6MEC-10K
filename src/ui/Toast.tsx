import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { palette } from '../theme/tokens';
import { Text } from './Text';

type Props = {
  message: string | null;
  tone?: 'paper' | 'ink';
  onDone?: () => void;
};

export function Toast({ message, tone = 'ink', onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(1900),
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(({ finished }) => {
      if (finished) onDone?.();
    });
  }, [message, opacity, onDone]);

  if (!message) return null;
  const onInk = tone === 'ink';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity,
          backgroundColor: onInk ? palette.paper : palette.ink,
        },
      ]}
    >
      <Text variant="micro" color={onInk ? palette.ink : palette.paper}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 18,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 320,
  },
});
