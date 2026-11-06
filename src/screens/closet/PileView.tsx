import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { GarmentView } from '../../types';
import { GarmentVisual } from '../../ui/GarmentVisual';
import { palette, hairline } from '../../theme/tokens';
import { Text } from '../../ui/Text';

type Props = {
  garments: GarmentView[];
  onOpen: (id: string) => void;
};

function unit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Almost the whole closet, stacked and movable. Piece size scales with the
 * inventory so 188 garments still read as one pile rather than a list.
 */
export function PileView({ garments, onOpen }: Props) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [activeId, setActiveId] = useState<string | null>(null);

  const size = Math.round(
    clamp(
      Math.sqrt((layout.width * layout.height) / Math.max(garments.length, 1) / 2.4) * 1.8,
      62,
      118,
    ),
  );

  return (
    <View
      style={styles.canvas}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (Math.abs(width - layout.width) > 1 || Math.abs(height - layout.height) > 1) {
          setLayout({ width, height });
        }
      }}
    >
      <View style={styles.hintRow} pointerEvents="none">
        <Text variant="micro" color={palette.mutedInk}>
          drag to move · tap to open · shake to switch back
        </Text>
      </View>
      {layout.width > 0 && layout.height > 0
        ? garments.map((garment, index) => (
            <PilePiece
              key={`${garment.id}-${layout.width}-${layout.height}`}
              garment={garment}
              index={index}
              total={garments.length}
              size={size}
              width={layout.width}
              height={layout.height}
              active={activeId === garment.id}
              onActivate={() => setActiveId(garment.id)}
              onRelease={() => setActiveId((current) => (current === garment.id ? null : current))}
              onOpen={() => onOpen(garment.id)}
            />
          ))
        : null}
      {garments.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="small" color={palette.mutedInk}>
            nothing in this category.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type PieceProps = {
  garment: GarmentView;
  index: number;
  total: number;
  size: number;
  width: number;
  height: number;
  active: boolean;
  onActivate: () => void;
  onRelease: () => void;
  onOpen: () => void;
};

function PilePiece({
  garment,
  index,
  total,
  size,
  width,
  height,
  active,
  onActivate,
  onRelease,
  onOpen,
}: PieceProps) {
  const angle = unit(`${garment.id}:a`) * Math.PI * 2;
  const radius = Math.pow(unit(`${garment.id}:r`), 0.56);
  const startX = clamp(
    (width - size) / 2 + Math.cos(angle) * radius * (width - size) * 0.46 + (unit(`${garment.id}:x`) - 0.5) * 22,
    6,
    width - size - 6,
  );
  const startY = clamp(
    (height - size) / 2 + Math.sin(angle) * radius * (height - size) * 0.46 + (unit(`${garment.id}:y`) - 0.5) * 22,
    30,
    height - size - 6,
  );
  const rotation = (unit(`${garment.id}:r2`) - 0.5) * 30;

  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [position, setPosition] = useState({ x: startX, y: startY });
  const positionRef = useRef(position);
  positionRef.current = position;
  const dragStart = useRef(position);
  const moved = useRef(false);
  const config = useRef({ width, height, size, onOpen, onActivate, onRelease });
  config.current = { width, height, size, onOpen, onActivate, onRelease };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        moved.current = false;
        dragStart.current = { ...positionRef.current };
        config.current.onActivate();
      },
      onPanResponderMove: (_event, gesture) => {
        if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6) moved.current = true;
        const { width: w, height: h, size: s } = config.current;
        const nextX = clamp(dragStart.current.x + gesture.dx, 4, w - s - 4);
        const nextY = clamp(dragStart.current.y + gesture.dy, 28, h - s - 4);
        translate.setValue({ x: nextX - dragStart.current.x, y: nextY - dragStart.current.y });
      },
      onPanResponderRelease: (_event, gesture) => {
        const { width: w, height: h, size: s } = config.current;
        const nextX = clamp(dragStart.current.x + gesture.dx, 4, w - s - 4);
        const nextY = clamp(dragStart.current.y + gesture.dy, 28, h - s - 4);
        translate.setValue({ x: 0, y: 0 });
        positionRef.current = { x: nextX, y: nextY };
        setPosition({ x: nextX, y: nextY });
        config.current.onRelease();
        if (!moved.current) config.current.onOpen();
      },
      onPanResponderTerminate: () => {
        translate.setValue({ x: 0, y: 0 });
        config.current.onRelease();
      },
    }),
  ).current;

  return (
    <Animated.View
      {...responder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={`${garment.name}, tap to open`}
      onAccessibilityTap={onOpen}
      style={[
        styles.piece,
        {
          width: size,
          height: size,
          left: position.x,
          top: position.y,
          zIndex: active ? 400 : index + 1,
          transform: [
            { translateX: translate.x },
            { translateY: translate.y },
            { rotate: `${rotation}deg` },
            { scale: active ? 1.08 : 1 },
          ],
          backgroundColor: garment.cutoutUri ? palette.paperDeep : palette.paperRaised,
          borderColor: active ? palette.ink : palette.paperLine,
        },
        active && styles.activeShadow,
      ]}
    >
      <GarmentVisual garment={garment} width={size * 0.9} height={size * 0.9} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: palette.paperDeep, overflow: 'hidden' },
  hintRow: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 500 },
  piece: {
    position: 'absolute',
    borderWidth: hairline,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  activeShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
