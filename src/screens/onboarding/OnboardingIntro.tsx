import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, hairline } from '../../theme/tokens';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { CrestMark } from '../../brand/CrestMark';
import { StudioPiece } from '../../art/GarmentArt';
import { useReducedMotion } from '../../theme/motion';
import { GarmentKind } from '../../types';

const NATIVE = Platform.OS !== 'web';

/** Coded intro: muted drawn strokes, ink fill, then a paper curtain. */
export function CodedIntro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Start open (0) and interpolate from the latest measured width, so a first
  // render with width 0 can never paint the curtains shut.
  const close = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);
  const leftX = close.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] });
  const rightX = close.interpolate({ inputRange: [0, 1], outputRange: [width / 2, 0] });

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (!reduced) return;
    const timer = setTimeout(finish, 1600);
    return () => clearTimeout(timer);
  }, [finish, reduced]);

  const onDrawn = useCallback(() => {
    if (reduced || finished.current) return;
    Animated.timing(close, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start(() => {
      setTimeout(finish, 240);
    });
  }, [close, finish, reduced]);

  return (
    <View style={styles.root}>
      <View style={[styles.introContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.topLine}>
          <Text variant="micro" color={palette.mutedOnInk}>
            crest
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="skip intro" onPress={finish} hitSlop={12}>
            <Text variant="micro" color={palette.paper}>
              skip
            </Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <CrestMark height={34} animate={!reduced} tinted onDrawn={onDrawn} />
          <Text variant="micro" color={palette.mutedOnInk} style={styles.tagline}>
            a quieter wardrobe
          </Text>
          {reduced ? (
            <Pressable accessibilityRole="button" onPress={finish} style={styles.continue} hitSlop={10}>
              <Text variant="micro" color={palette.paper}>
                continue
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text variant="micro" color={palette.mutedOnInk}>
          {reduced ? 'motion reduced' : `v.1 · ${new Date().getFullYear()}`}
        </Text>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[styles.curtain, styles.curtainLeft, { width: width / 2, transform: [{ translateX: leftX }] }]}
      >
        <View style={styles.curtainEdge} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.curtain, styles.curtainRight, { width: width / 2, transform: [{ translateX: rightX }] }]}
      >
        <View style={styles.curtainEdgeRight} />
      </Animated.View>
    </View>
  );
}

const COLUMN_KINDS: GarmentKind[] = [
  'coat',
  'knit',
  'trousers',
  'sneaker',
  'shirt',
  'boot',
  'jacket',
  'cap',
  'bag',
  'jeans',
  'loafer',
  'shorts',
];

/** Splash: three slow columns of studio garments behind a paper curtain. */
export function DriftingSplash({ onBegin, onSkip }: { onBegin: () => void; onSkip: () => void }) {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const closed = useRef(new Animated.Value(reduced ? 0 : 1)).current;

  useEffect(() => {
    if (reduced) {
      closed.setValue(0);
      return;
    }
    Animated.timing(closed, {
      toValue: 0,
      duration: 780,
      delay: 140,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [closed, reduced]);

  const leftX = closed.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] });
  const rightX = closed.interpolate({ inputRange: [0, 1], outputRange: [width / 2, 0] });

  const columnWidth = Math.min(width * 0.29, 108);

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[0, 1, 2].map((column) => (
          <DriftColumn
            key={column}
            index={column}
            reduced={reduced}
            width={columnWidth}
            left={width * (0.025 + column * 0.335)}
            height={height}
          />
        ))}
        <View style={styles.veil} />
      </View>

      <View style={styles.splashContent}>
        <View style={[styles.splashTop, { paddingTop: insets.top + 18 }]}>
          <CrestMark height={17} color={palette.paper} />
          <Pressable accessibilityRole="button" accessibilityLabel="skip" onPress={onSkip} hitSlop={12}>
            <Text variant="micro" color={palette.paper}>
              skip
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

        <View style={[styles.splashPanel, { paddingBottom: insets.bottom + 22 }]}>
          <Text variant="display" color={palette.paper}>
            what you own,
          </Text>
          <Text variant="display" color={palette.paper}>
            styled.
          </Text>
          <Text variant="small" color={palette.mutedOnInk} style={styles.splashBody}>
            your closet, indexed. a stylist with nothing to sell.
          </Text>
          <Button label="begin" variant="solidPaper" onPress={onBegin} style={styles.begin} />
        </View>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[styles.curtain, styles.curtainLeft, { width: width / 2, transform: [{ translateX: leftX }] }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.curtain, styles.curtainRight, { width: width / 2, transform: [{ translateX: rightX }] }]}
      />
    </View>
  );
}

function DriftColumn({
  index,
  reduced,
  width,
  left,
  height,
}: {
  index: number;
  reduced: boolean;
  width: number;
  left: number;
  height: number;
}) {
  const drift = useRef(new Animated.Value(0)).current;
  const tileHeight = 116;
  const gap = 10;
  const count = 7;
  const contentHeight = count * (tileHeight + gap);

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(
      Animated.timing(drift, {
        toValue: -contentHeight,
        duration: 30000 + index * 7000,
        easing: Easing.linear,
        useNativeDriver: NATIVE,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [contentHeight, drift, index, reduced]);

  return (
    <View style={[styles.column, { left, width, top: -60, height: height + 120 }]}>
      <Animated.View style={{ transform: [{ translateY: reduced ? -index * 54 : drift }] }}>
        {[0, 1].map((copy) => (
          <View key={copy}>
            {Array.from({ length: count }).map((_, tileIndex) => {
              const kind = COLUMN_KINDS[(index * 4 + tileIndex + copy) % COLUMN_KINDS.length];
              return (
                <View key={`${copy}-${tileIndex}`} style={[styles.tile, { height: tileHeight, marginBottom: gap }]}>
                  <StudioPiece kind={kind} width={width - 18} height={tileHeight - 22} tone={index + tileIndex} />
                </View>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink, overflow: 'hidden' },
  introContent: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  tagline: { marginTop: 18 },
  continue: { marginTop: 26, paddingVertical: 12, paddingHorizontal: 18 },
  curtain: { position: 'absolute', top: 0, bottom: 0, backgroundColor: palette.paper },
  curtainLeft: { left: 0 },
  curtainRight: { right: 0 },
  curtainEdge: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 1, backgroundColor: palette.paperLine },
  curtainEdgeRight: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, backgroundColor: palette.paperLine },
  splashContent: { flex: 1 },
  splashTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 14,
    backgroundColor: palette.ink,
    borderBottomWidth: hairline,
    borderBottomColor: palette.inkLine,
  },
  splashPanel: {
    backgroundColor: palette.ink,
    paddingHorizontal: 24,
    paddingTop: 22,
    borderTopWidth: hairline,
    borderTopColor: palette.inkLine,
  },
  splashBody: { marginTop: 12, maxWidth: 280 },
  begin: { marginTop: 22, width: 160 },
  column: { position: 'absolute', overflow: 'hidden' },
  tile: { backgroundColor: palette.paper, alignItems: 'center', justifyContent: 'center' },
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,11,11,0.52)',
  },
});
