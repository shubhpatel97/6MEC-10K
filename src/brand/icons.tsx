import React from 'react';
import { G, Path, Svg } from 'react-native-svg';

type IconProps = {
  size?: number;
  color: string;
  strokeWidth?: number;
};

/** closet — a hanger */
export function HangerIcon({ size = 22, color, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5a2 2 0 1 1 2 2c-.9 0-1.6.7-1.6 1.6v1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M12.4 8.1 3.6 14.2c-.9.6-.5 1.9.5 1.9h15.8c1 0 1.4-1.3.5-1.9l-4.9-3.4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** stylist — a conversation mark */
export function StylistIcon({ size = 22, color, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5.6h16v10.2H11.3L7 19.4v-3.6H4V5.6Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path d="M8.4 10.7h7.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.4 13.5h4.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** you — a person */
export function YouIcon({ size = 22, color, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 11.4a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M4.6 20.2c.5-3.5 3.5-5.9 7.4-5.9s6.9 2.4 7.4 5.9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ChevronIcon({
  size = 16,
  color,
  direction = 'right',
  strokeWidth = 1.5,
}: IconProps & { direction?: 'left' | 'right' | 'up' | 'down' }) {
  const rotation = { right: 0, down: 90, left: 180, up: 270 }[direction];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: [{ rotate: `${rotation}deg` }] }}>
      <Path d="m9 5 7 7-7 7" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 18, color, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 5l14 14M19 5 5 19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function MicIcon({ size = 20, color, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4a2.6 2.6 0 0 0-2.6 2.6v5a2.6 2.6 0 0 0 5.2 0v-5A2.6 2.6 0 0 0 12 4Z" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M6.4 11.4a5.6 5.6 0 0 0 11.2 0M12 17v3.2M9.4 20.2h5.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function SendIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12h15M13.5 5.5 20 12l-6.5 6.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function GridIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" stroke={color} strokeWidth={1.3} />
    </Svg>
  );
}

export function PileIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 15.5 12 9l8 6.5-8 5-8-5Z" stroke={color} strokeWidth={1.3} strokeLinejoin="round" />
      <Path d="M6.5 11 12 6.6l5.5 4.4" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

export function SparkIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}
