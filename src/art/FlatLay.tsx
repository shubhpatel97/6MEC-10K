import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Garment } from '../types';
import { palette, hairline } from '../theme/tokens';
import { GarmentArt } from './GarmentArt';

type Props = {
  garments: Garment[];
  size: number;
  columns?: number;
  max?: number;
};

/**
 * An outfit board in place of the original flat-lay photography.
 * Demo boards are vector compositions and are always labelled as demo.
 */
export function FlatLay({ garments, size, columns = 2, max = 4 }: Props) {
  const shown = garments.slice(0, max);
  const cell = size / columns;
  return (
    <View style={[styles.grid, { width: size }]}>
      {shown.map((garment) => (
        <View
          key={garment.id}
          style={[
            styles.cell,
            {
              width: cell,
              height: cell,
              backgroundColor: palette.paperRaised,
            },
          ]}
        >
          <GarmentArt
            kind={garment.kind}
            color={garment.color}
            accent={garment.accent}
            width={cell * 0.82}
            height={cell * 0.82}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: hairline,
    borderBottomWidth: hairline,
    borderColor: palette.paperLine,
  },
});
