import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GarmentView, ProposedLook } from '../types';
import { palette, radius, hairline } from '../theme/tokens';
import { Text } from './Text';
import { GarmentTile } from './GarmentTile';

type Props = {
  look: ProposedLook;
  garments: GarmentView[];
  width: number;
  saved: boolean;
  wornToday: boolean;
  onSave: () => void;
  onShuffle: () => void;
  onDislike: () => void;
  onWear: () => void;
  onOpenGarment: (id: string) => void;
  busy?: boolean;
};

const COLUMNS = 3;
const PADDING = 14;
const GAP = 8;

/** Look cards are chat surfaces, so this is the one place rounding belongs. */
export function LookCard({
  look,
  garments,
  width,
  saved,
  wornToday,
  onSave,
  onShuffle,
  onDislike,
  onWear,
  onOpenGarment,
  busy = false,
}: Props) {
  const items = look.itemIds
    .map((id) => garments.find((garment) => garment.id === id))
    .filter((garment): garment is GarmentView => Boolean(garment));
  const tileWidth = Math.floor((width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const rows: GarmentView[][] = [];
  for (let i = 0; i < items.length; i += COLUMNS) rows.push(items.slice(i, i + COLUMNS));

  const actions: { label: string; onPress: () => void; active: boolean; emphasis?: boolean }[] = [
    { label: saved ? 'saved' : 'save', onPress: onSave, active: saved },
    { label: 'shuffle', onPress: onShuffle, active: false },
    { label: 'not for me', onPress: onDislike, active: false },
    { label: wornToday ? 'worn today' : 'wear it', onPress: onWear, active: wornToday, emphasis: !wornToday },
  ];

  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.header}>
        <Text variant="displaySmall" color={palette.paper}>
          {look.title}
        </Text>
        <Text variant="small" color={palette.mutedOnInk} style={styles.note}>
          {look.note}
        </Text>
      </View>

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((garment) => (
              <GarmentTile
                key={garment.id}
                garment={garment}
                width={tileWidth}
                tone="ink"
                artHeight={Math.round(tileWidth * 1.04)}
                showName
                onPress={() => onOpenGarment(garment.id)}
                accessibilityLabel={`${garment.name}, open details`}
              />
            ))}
            {row.length < COLUMNS
              ? Array.from({ length: COLUMNS - row.length }).map((_, filler) => (
                  <View key={`filler-${filler}`} style={{ width: tileWidth }} />
                ))
              : null}
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: busy || (action.label === 'worn today' && wornToday) }}
            disabled={busy || (action.label === 'worn today' && wornToday)}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.action,
              pressed && { backgroundColor: palette.inkSoft },
              (busy || (action.label === 'worn today' && wornToday)) && { opacity: 0.5 },
            ]}
          >
            <Text
              variant="meta"
              color={action.active ? palette.paper : palette.mutedOnInk}
              style={action.emphasis ? { color: palette.paper, fontWeight: '500' } : undefined}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.inkRaised,
    borderRadius: radius.chatCard,
    borderWidth: hairline,
    borderColor: palette.inkLine,
    overflow: 'hidden',
    marginTop: 10,
  },
  header: { paddingHorizontal: PADDING, paddingTop: 14, paddingBottom: 4 },
  note: { marginTop: 5, maxWidth: 280 },
  grid: { paddingHorizontal: PADDING, paddingTop: 10, gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    borderTopWidth: hairline,
    borderTopColor: palette.inkLine,
  },
  action: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: hairline,
    borderLeftColor: palette.inkLine,
  },
});
