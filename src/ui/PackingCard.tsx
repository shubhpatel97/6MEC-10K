import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GarmentView, PackingPlan } from '../types';
import { palette, radius, hairline } from '../theme/tokens';
import { Text } from './Text';
import { GarmentVisual } from './GarmentVisual';

type Props = {
  plan: PackingPlan;
  garments: GarmentView[];
  width: number;
  onOpenGarment: (id: string) => void;
};

/** Packing is handled inside the conversation, never in its own tab. */
export function PackingCard({ plan, garments, width, onOpenGarment }: Props) {
  const lookup = (ids: string[]) =>
    ids.map((id) => garments.find((garment) => garment.id === id)).filter((g): g is GarmentView => Boolean(g));

  return (
    <View style={[styles.card, { width }]}>
      <Text variant="micro" color={palette.mutedOnInk}>
        packing plan
      </Text>
      <Text variant="displaySmall" color={palette.paper} style={styles.title}>
        {plan.title}
      </Text>

      <View style={styles.sections}>
        {plan.sections.map((section) => {
          const items = lookup(section.itemIds);
          return (
            <View key={section.label} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text variant="micro" color={palette.mutedOnInk}>
                  {section.label}
                </Text>
                <Text variant="micro" color={palette.mutedOnInk}>
                  {items.length}
                </Text>
              </View>
              <Text variant="small" color={palette.paper}>
                {items.map((item) => item.name).join(' · ')}
              </Text>
            </View>
          );
        })}
      </View>

      {plan.looks.length > 0 ? (
        <View style={styles.looks}>
          <Text variant="micro" color={palette.mutedOnInk}>
            starting looks
          </Text>
          {plan.looks.map((look) => (
            <View key={look.key} style={styles.lookRow}>
              <Text variant="meta" color={palette.mutedOnInk} style={styles.lookTitle} numberOfLines={1}>
                {look.title}
              </Text>
              <View style={styles.thumbs}>
                {look.itemIds.slice(0, 6).map((id) => {
                  const garment = lookup([id])[0];
                  if (!garment) return null;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityLabel={`${garment.name}, open details`}
                      onPress={() => onOpenGarment(id)}
                      style={[styles.thumb, { backgroundColor: palette.paper }]}
                    >
                      <GarmentVisual garment={garment} width={26} height={30} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.inkRaised,
    borderRadius: radius.chatCard,
    borderWidth: hairline,
    borderColor: palette.inkLine,
    padding: 14,
    marginTop: 10,
  },
  title: { marginTop: 4 },
  sections: { marginTop: 12, gap: 10 },
  section: { borderTopWidth: hairline, borderTopColor: palette.inkLine, paddingTop: 8 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  looks: { marginTop: 14, gap: 8 },
  lookRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lookTitle: { width: 88 },
  thumbs: { flexDirection: 'row', gap: 6 },
  thumb: { width: 28, height: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
