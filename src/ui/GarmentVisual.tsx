import React from 'react';
import { Image } from 'react-native';
import { Garment } from '../types';
import { GarmentArt } from '../art/GarmentArt';

type Props = {
  garment: Pick<Garment, 'kind' | 'color' | 'accent' | 'cutoutUri' | 'name'>;
  width: number;
  height: number;
};

/**
 * Real cutouts replace the vector silhouette wherever a garment is shown.
 * The cutout already has transparent padding, so both stay inside a box.
 */
export function GarmentVisual({ garment, width, height }: Props) {
  if (garment.cutoutUri) {
    return (
      <Image
        source={{ uri: garment.cutoutUri }}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessibilityLabel={`${garment.name} cutout`}
      />
    );
  }
  return <GarmentArt kind={garment.kind} color={garment.color} accent={garment.accent} width={width} height={height} />;
}
