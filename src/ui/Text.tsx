import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { type as typeStyles } from '../theme/typography';

type Variant = keyof typeof typeStyles;

type Props = TextProps & {
  variant?: Variant;
  color?: string;
};

/** Interface copy is lowercase by convention; this component never transforms case. */
export function Text({ variant = 'body', color, style, ...rest }: Props) {
  return <RNText {...rest} style={[typeStyles[variant], color ? { color } : null, style]} />;
}
