import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Category } from '../types';
import { categoryLabel, categoryOrder, palette, hairline } from '../theme/tokens';
import { Text } from '../ui/Text';
import { GarmentTile } from '../ui/GarmentTile';
import { Sheet } from '../ui/Sheet';
import { GarmentDetailModal } from './GarmentDetailScreen';
import { PileView } from './closet/PileView';
import { useWardrobe } from '../state/WardrobeProvider';
import { useShake } from '../lib/useShake';
import { GridIcon, PileIcon, SparkIcon } from '../brand/icons';

type FilterKey = 'all' | Category;
type SortKey = 'recent' | 'most worn' | 'least worn' | 'colour' | 'category';
type ViewMode = 'grid' | 'pile';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'all' },
  ...categoryOrder.map((category) => ({ key: category as FilterKey, label: categoryLabel[category] })),
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'recently added' },
  { key: 'most worn', label: 'most worn' },
  { key: 'least worn', label: 'least worn' },
  { key: 'colour', label: 'colour' },
  { key: 'category', label: 'category' },
];

type Props = {
  onAskStylist: () => void;
  onStyleGarment: (id: string) => void;
};

/** The closet lives on paper. Garments supply the only colour worth having. */
export function ClosetScreen({ onAskStylist, onStyleGarment }: Props) {
  const { garmentViews, demoCloset } = useWardrobe();
  const { width: windowWidth } = useWindowDimensions();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [view, setView] = useState<ViewMode>('grid');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const toggleView = () => setView((current) => (current === 'grid' ? 'pile' : 'grid'));
  useShake(toggleView);

  const contentWidth = Math.min(windowWidth, 760) - 40;
  const columns = contentWidth >= 620 ? 4 : 3;
  const gap = 14;
  const tileWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);

  const filtered = useMemo(() => {
    const list = garmentViews.filter((garment) => filter === 'all' || garment.category === filter);
    switch (sort) {
      case 'most worn':
        return [...list].sort((a, b) => b.wearCount - a.wearCount || a.name.localeCompare(b.name));
      case 'least worn':
        return [...list].sort((a, b) => a.wearCount - b.wearCount || a.name.localeCompare(b.name));
      case 'colour':
        return [...list].sort((a, b) => a.colorName.localeCompare(b.colorName) || a.name.localeCompare(b.name));
      case 'category':
        return [...list].sort(
          (a, b) =>
            categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) ||
            a.name.localeCompare(b.name),
        );
      case 'recent':
      default:
        return [...list].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    }
  }, [garmentViews, filter, sort]);

  const selected = selectedId ? garmentViews.find((garment) => garment.id === selectedId) ?? null : null;
  const sortLabel = SORTS.find((option) => option.key === sort)?.label ?? 'recently added';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text variant="display" color={palette.ink}>
            closet
          </Text>
          <View style={styles.viewToggle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="grid view"
              accessibilityState={{ selected: view === 'grid' }}
              onPress={() => setView('grid')}
              style={styles.viewButton}
              hitSlop={8}
            >
              <GridIcon size={17} color={view === 'grid' ? palette.ink : palette.mutedInk} />
              <Text variant="micro" color={view === 'grid' ? palette.ink : palette.mutedInk}>
                grid
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="pile view"
              accessibilityState={{ selected: view === 'pile' }}
              onPress={() => setView('pile')}
              style={styles.viewButton}
              hitSlop={8}
            >
              <PileIcon size={17} color={view === 'pile' ? palette.ink : palette.mutedInk} />
              <Text variant="micro" color={view === 'pile' ? palette.ink : palette.mutedInk}>
                pile
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text variant="meta" color={palette.mutedInk}>
            {filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}
            {demoCloset ? ' · demo closet' : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`sort by ${sortLabel}`}
            onPress={() => setSortOpen(true)}
            hitSlop={10}
          >
            <Text variant="meta" color={palette.ink}>
              sort · {sortLabel}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((option) => {
          const active = filter === option.key;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(option.key)}
              style={styles.filter}
            >
              <Text
                variant="meta"
                color={active ? palette.ink : palette.mutedInk}
                style={active ? styles.filterActive : undefined}
              >
                {option.label}
              </Text>
              <View style={[styles.filterRule, active && { backgroundColor: palette.ink }]} />
            </Pressable>
          );
        })}
      </View>

      {view === 'grid' ? (
        <FlatList
          key={`grid-${columns}`}
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={{ gap }}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <GarmentTile
              garment={item}
              width={tileWidth}
              showWear
              onPress={() => setSelectedId(item.id)}
              accessibilityLabel={`${item.name}, ${item.wearCount === 0 ? 'never worn' : `worn ${item.wearCount} times`}`}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="title" color={palette.ink}>
                nothing hanging here.
              </Text>
              <Text variant="small" color={palette.mutedInk} style={styles.emptyBody}>
                try another category, or restart setup from the you tab.
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.pileWrap}>
          <PileView garments={filtered} onOpen={(id) => setSelectedId(id)} />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ask your stylist"
        onPress={onAskStylist}
        style={({ pressed }) => [styles.pill, pressed && { opacity: 0.85 }]}
      >
        <SparkIcon size={13} color={palette.paper} />
        <Text variant="meta" color={palette.paper}>
          ask your stylist
        </Text>
      </Pressable>

      <Sheet visible={sortOpen} onClose={() => setSortOpen(false)} title="sort">
        {SORTS.map((option) => {
          const active = sort === option.key;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setSort(option.key);
                setSortOpen(false);
              }}
              style={[styles.sortRow, active && styles.sortRowActive]}
            >
              <Text variant={active ? 'bodyStrong' : 'body'} color={palette.ink}>
                {option.label}
              </Text>
              {active ? (
                <Text variant="micro" color={palette.mutedInk}>
                  selected
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </Sheet>

      <GarmentDetailModal
        garment={selected}
        origin="closet"
        onClose={() => setSelectedId(null)}
        onStyle={(id) => {
          setSelectedId(null);
          onStyleGarment(id);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.paper },
  header: { paddingHorizontal: 20, paddingTop: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  viewToggle: { flexDirection: 'row', gap: 16, paddingBottom: 5 },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 28 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingBottom: 10,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 4,
  },
  filter: { paddingTop: 9, minHeight: 38 },
  filterActive: { fontWeight: '500' },
  filterRule: { height: 1.5, marginTop: 5, backgroundColor: 'transparent' },
  gridContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 112, gap: 22 },
  empty: { paddingTop: 80, alignItems: 'flex-start' },
  emptyBody: { marginTop: 8, maxWidth: 280 },
  pileWrap: { flex: 1, paddingHorizontal: 12, paddingBottom: 74 },
  pill: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: palette.ink,
    paddingHorizontal: 20,
    height: 46,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  sortRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: hairline,
    borderTopColor: palette.paperLine,
  },
  sortRowActive: {},
});
