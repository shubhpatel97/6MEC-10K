import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { palette, radius } from '../theme/tokens';
import { Text } from './Text';

type Variant = 'solidInk' | 'solidPaper' | 'outlineInk' | 'outlinePaper' | 'quietInk' | 'quietPaper';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'lg' | 'md' | 'sm';
  disabled?: boolean;
  style?: ViewStyle;
  pill?: boolean;
  accessibilityLabel?: string;
};

/** Sharp default. `pill` is only for chat-adjacent actions. */
export function Button({
  label,
  onPress,
  variant = 'solidInk',
  size = 'lg',
  disabled = false,
  style,
  pill = false,
  accessibilityLabel,
}: Props) {
  const theme = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : size === 'md' ? styles.md : styles.sm,
        { backgroundColor: theme.background, borderColor: theme.border },
        theme.border ? styles.bordered : null,
        pill && { borderRadius: radius.chip },
        disabled && { opacity: 0.35 },
        pressed && !disabled && { opacity: 0.72 },
        style,
      ]}
    >
      <Text variant="small" color={theme.text} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { background: string; text: string; border: string }> = {
  solidInk: { background: palette.ink, text: palette.paper, border: palette.ink },
  solidPaper: { background: palette.paper, text: palette.ink, border: palette.paper },
  outlineInk: { background: 'transparent', text: palette.ink, border: palette.ink },
  outlinePaper: { background: 'transparent', text: palette.paper, border: palette.inkLine },
  quietInk: { background: 'transparent', text: palette.mutedInk, border: 'transparent' },
  quietPaper: { background: 'transparent', text: palette.paper, border: 'transparent' },
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: radius.sharp,
  },
  bordered: { borderWidth: 1 },
  lg: { height: 52 },
  md: { height: 44 },
  sm: { height: 38, paddingHorizontal: 14 },
  label: { fontWeight: '500', letterSpacing: 0.1 },
});
