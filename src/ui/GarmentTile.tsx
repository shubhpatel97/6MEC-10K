import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Garment, GarmentView } from '../types';
import { GarmentVisual } from './GarmentVisual';
import { palette, hairline } from '../theme/tokens';
import { Text } from './Text';

type Props = {
  garment: Garment | GarmentView;
  width: number;
  artHeight?: number;
  onPress?: () => void;
  tone?: 'paper' | 'ink';
  showName?: boolean;
  showWear?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  badge?: string;
  accessibilityLabel?: string;
};

/**
 * A garment tile: sharp edges, art on a quiet ground, no source brands,
 * no prices. On paper for the closet, on ink for chat look cards.
 */
export function GarmentTile({
  garment,
  width,
  artHeight,
  onPress,
  tone = 'paper',
  showName = true,
  showWear = false,
  selected = true,
  dimmed = false,
  badge,
  accessibilityLabel,
}: Props) {
  const onInk = tone === 'ink';
  const artGround = garment.cutoutUri ? palette.paperDeep : onInk ? palette.paper : palette.paperRaised;
  const labelColor = onInk ? palette.paper : palette.ink;
  const metaColor = onInk ? palette.mutedOnInk : palette.mutedInk;
  const height = artHeight ?? Math.round(width * 1.06);
  const neverWorn = 'wearCount' in garment && garment.wearCount === 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel ?? `${garment.name}, ${garment.colorName}`}
      style={({ pressed }) => [{ width }, pressed && onPress ? { opacity: 0.75 } : null]}
    >
      <View
        style={[
          styles.art,
          {
            width,
            height,
            backgroundColor: artGround,
            borderColor: onInk ? palette.inkLine : palette.paperLine,
          },
        ]}
      >
        <GarmentVisual
          garment={garment}
          width={width * (garment.cutoutUri ? 0.94 : 0.78)}
          height={height * (garment.cutoutUri ? 0.94 : 0.86)}
        />
        {badge ? (
          <View style={styles.badge}>
            <Text variant="micro" color={palette.ink}>
              {badge}
            </Text>
          </View>
        ) : null}
        {!selected ? (
          <View style={styles.removed}>
            <Text variant="micro" color={palette.paper}>
              removed
            </Text>
          </View>
        ) : null}
        {dimmed ? <View style={styles.dim} /> : null}
      </View>
      {showName ? (
        <Text
          variant="meta"
          color={labelColor}
          numberOfLines={2}
          style={styles.name}
        >
          {garment.name}
        </Text>
      ) : null}
      {showWear && 'wearCount' in garment ? (
        <Text variant="micro" color={neverWorn ? palette.never : metaColor} style={styles.wear}>
          {neverWorn ? 'never worn' : `worn ${garment.wearCount}×`}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  art: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: hairline,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: palette.paper,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  removed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,11,11,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,11,11,0.28)',
  },
  name: { marginTop: 7, minHeight: 36 },
  wear: { marginTop: 1 },
});
