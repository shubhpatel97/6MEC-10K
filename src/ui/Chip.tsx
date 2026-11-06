import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { palette, radius } from '../theme/tokens';
import { Text } from './Text';

type Props = {
  label: string;
  onPress?: () => void;
  active?: boolean;
  tone?: 'ink' | 'paper';
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** Rounded chips belong to chat. */
export function Chip({ label, onPress, active = false, tone = 'ink', disabled = false, accessibilityLabel }: Props) {
  const isInk = tone === 'ink';
  const background = active ? (isInk ? palette.paper : palette.ink) : isInk ? palette.inkRaised : palette.paperRaised;
  const color = active ? (isInk ? palette.ink : palette.paper) : isInk ? palette.paper : palette.ink;
  const border = active ? color : isInk ? palette.inkLine : palette.paperLine;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: background, borderColor: border },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text variant="meta" color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.chip,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
});
