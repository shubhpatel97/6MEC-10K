import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, categoryLabel, hairline, radius } from '../theme/tokens';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { GarmentVisual } from '../ui/GarmentVisual';
import { Sheet } from '../ui/Sheet';
import { Toast } from '../ui/Toast';
import { useWardrobe } from '../state/WardrobeProvider';
import { lastWornLabel } from '../lib/date';

type Props = {
  onOpenStylist: () => void;
};

/** You lives on black: statistics and saved pieces, no commerce. */
export function YouScreen({ onOpenStylist }: Props) {
  const {
    garmentViews,
    garmentById,
    stats,
    savedLooks,
    removeSavedLook,
    logWear,
    wornToday,
    resetAll,
    demoCloset,
  } = useWardrobe();
  const { width: windowWidth } = useWindowDimensions();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const maxColor = Math.max(1, ...stats.colors.map((color) => color.count));

  const underused = useMemo(
    () =>
      [...garmentViews]
        .filter((garment) => garment.wearCount <= 1 || (garment.lastWornDays ?? 0) > 45)
        .sort((a, b) => a.wearCount - b.wearCount || (b.lastWornDays ?? 0) - (a.lastWornDays ?? 0))
        .slice(0, 8),
    [garmentViews],
  );

  const savedWidth = Math.min(windowWidth, 760) - 40;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text variant="display" color={palette.paper}>
            you
          </Text>
          {demoCloset ? (
            <Text variant="micro" color={palette.mutedOnInk}>
              demo closet
            </Text>
          ) : null}
        </View>

        <View style={styles.stats}>
          <Stat label="pieces" value={stats.pieces} />
          <Stat label="wears logged" value={stats.wears} bordered />
          <Stat label="never worn" value={stats.neverWorn} bordered accent={stats.neverWorn > 0} />
        </View>

        <View style={styles.categoryLine}>
          <Text variant="meta" color={palette.mutedOnInk}>
            {stats.categories
              .map((entry) => `${categoryLabel[entry.category as keyof typeof categoryLabel]} ${entry.count}`)
              .join(' · ')}
          </Text>
        </View>

        <Section title="saved looks" meta={savedLooks.length > 0 ? `${savedLooks.length}` : undefined}>
          {savedLooks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text variant="small" color={palette.mutedOnInk}>
                nothing saved yet. looks you save in the stylist appear here.
              </Text>
              <Button
                label="open stylist"
                variant="outlinePaper"
                size="md"
                onPress={onOpenStylist}
                style={styles.emptyButton}
              />
            </View>
          ) : (
            savedLooks.map((look) => {
              const pieces = look.itemIds
                .map((id) => garmentById(id))
                .filter((piece): piece is NonNullable<typeof piece> => Boolean(piece));
              const worn = look.itemIds.length > 0 && look.itemIds.every((id) => wornToday.has(id));
              return (
                <View key={look.id} style={styles.savedCard}>
                  <View style={styles.savedThumbs}>
                    {pieces.slice(0, 3).map((piece) => (
                      <View key={piece.id} style={styles.savedThumb}>
                        <GarmentVisual garment={piece} width={52} height={58} />
                      </View>
                    ))}
                  </View>
                  <View style={styles.savedBody}>
                    <Text variant="bodyStrong" color={palette.paper}>
                      {look.title}
                    </Text>
                    <Text variant="micro" color={palette.mutedOnInk} style={styles.savedNote} numberOfLines={2}>
                      {look.note}
                    </Text>
                    <View style={styles.savedActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={worn ? 'already worn today' : 'wear this saved look'}
                        disabled={worn}
                        onPress={() => {
                          const result = logWear(look.itemIds, 'look');
                          setToast(
                            result.logged.length > 0
                              ? `worn today · ${result.logged.length} logged`
                              : 'already logged today',
                          );
                        }}
                        hitSlop={6}
                      >
                        <Text variant="micro" color={worn ? palette.mutedOnInk : palette.paper}>
                          {worn ? 'worn today ✓' : 'wear it'}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="remove saved look"
                        onPress={() => {
                          removeSavedLook(look.id);
                          setToast('removed from saved');
                        }}
                        hitSlop={6}
                      >
                        <Text variant="micro" color={palette.mutedOnInk}>
                          remove
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Section>

        <Section title="underused" meta={underused.length > 0 ? `${underused.length}` : undefined}>
          {underused.length === 0 ? (
            <Text variant="small" color={palette.mutedOnInk}>
              everything is in rotation. nothing is sitting idle.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.underusedRow}>
              {underused.map((garment) => (
                <View key={garment.id} style={styles.underusedTile}>
                  <View style={styles.underusedArt}>
                    <GarmentVisual garment={garment} width={82} height={90} />
                  </View>
                  <Text variant="meta" color={palette.paper} numberOfLines={2} style={styles.underusedName}>
                    {garment.name}
                  </Text>
                  <Text variant="micro" color={garment.wearCount === 0 ? palette.never : palette.mutedOnInk}>
                    {garment.wearCount === 0 ? 'never worn' : lastWornLabel(garment.lastWornAt)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </Section>

        <Section title="colour">
          <View style={styles.colors}>
            {stats.colors.map((color) => (
              <View key={color.name} style={styles.colorRow}>
                <View style={[styles.swatch, { backgroundColor: color.color }]} />
                <Text variant="meta" color={palette.paper} style={styles.colorName}>
                  {color.name}
                </Text>
                <View style={styles.colorTrack}>
                  <View
                    style={[
                      styles.colorFill,
                      { backgroundColor: color.color, width: `${(color.count / maxColor) * 100}%` },
                    ]}
                  />
                </View>
                <Text variant="micro" color={palette.mutedOnInk} style={styles.colorCount}>
                  {color.count}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <View style={styles.footer}>
          <Text variant="micro" color={palette.mutedOnInk} style={styles.footerNote}>
            {demoCloset
              ? 'demo wardrobe · garment art is illustrated, wear history is seeded. nothing is shared or uploaded.'
              : 'your real cutouts and closet are stored on this device. nothing is uploaded.'}
          </Text>
          <Button
            label="log out"
            variant="outlinePaper"
            size="md"
            onPress={() => setLogoutOpen(true)}
            style={styles.logout}
          />
        </View>
      </ScrollView>

      <Sheet visible={logoutOpen} onClose={() => setLogoutOpen(false)} title="log out" tone="ink">
        <Text variant="small" color={palette.mutedOnInk} style={styles.logoutCopy}>
          this clears the closet, wear history, saved looks and conversation from this device. it cannot be undone.
        </Text>
        <View style={styles.logoutActions}>
          <Button
            label="cancel"
            variant="outlinePaper"
            onPress={() => setLogoutOpen(false)}
            style={styles.logoutButton}
          />
          <Button
            label="log out"
            variant="solidPaper"
            onPress={async () => {
              setLogoutOpen(false);
              await resetAll();
            }}
            style={styles.logoutButton}
          />
        </View>
      </Sheet>

      <Toast message={toast} tone="ink" onDone={() => setToast(null)} />
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  bordered = false,
  accent = false,
}: {
  label: string;
  value: number;
  bordered?: boolean;
  accent?: boolean;
}) {
  return (
    <View
      style={[
        styles.stat,
        bordered && { borderLeftWidth: hairline, borderLeftColor: palette.inkLine, paddingLeft: 16 },
      ]}
    >
      <Text variant="numeric" color={accent ? palette.never : palette.paper}>
        {value}
      </Text>
      <Text variant="micro" color={palette.mutedOnInk} style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="micro" color={palette.mutedOnInk}>
          {title}
        </Text>
        {meta ? (
          <Text variant="micro" color={palette.mutedOnInk}>
            {meta}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ink },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  stats: { flexDirection: 'row', paddingVertical: 24, borderTopWidth: hairline, borderTopColor: palette.inkLine, marginTop: 14 },
  stat: { flex: 1 },
  statLabel: { marginTop: 6 },
  categoryLine: { paddingBottom: 22 },
  section: { borderTopWidth: hairline, borderTopColor: palette.inkLine, paddingTop: 16, paddingBottom: 22 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  emptyCard: { borderWidth: hairline, borderColor: palette.inkLine, padding: 16 },
  emptyButton: { marginTop: 14, alignSelf: 'flex-start' },
  savedCard: {
    borderWidth: hairline,
    borderColor: palette.inkLine,
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  savedThumbs: { flexDirection: 'row', width: 108, gap: 4 },
  savedThumb: { width: 33, height: 42, backgroundColor: palette.paper, alignItems: 'center', justifyContent: 'center' },
  savedBody: { flex: 1 },
  savedNote: { marginTop: 4 },
  savedActions: { flexDirection: 'row', gap: 18, marginTop: 12, alignItems: 'center' },
  underusedRow: { gap: 14, paddingRight: 8 },
  underusedTile: { width: 92 },
  underusedArt: { width: 92, height: 100, backgroundColor: palette.paper, alignItems: 'center', justifyContent: 'center' },
  underusedName: { marginTop: 6 },
  colors: { gap: 12 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 12, height: 12, borderWidth: hairline, borderColor: palette.inkSoft },
  colorName: { width: 88 },
  colorTrack: { flex: 1, height: 2, backgroundColor: palette.inkLine },
  colorFill: { height: 2 },
  colorCount: { width: 24, textAlign: 'right' },
  footer: { borderTopWidth: hairline, borderTopColor: palette.inkLine, paddingTop: 18 },
  footerNote: { maxWidth: 340 },
  logout: { marginTop: 16, alignSelf: 'flex-start', minWidth: 120 },
  logoutCopy: { maxWidth: 380, marginBottom: 16 },
  logoutActions: { flexDirection: 'row', gap: 10 },
  logoutButton: { flex: 1 },
});
