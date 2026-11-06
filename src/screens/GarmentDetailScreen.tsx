import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GarmentView, OutfitBoard } from '../types';
import { palette, hairline } from '../theme/tokens';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { GarmentVisual } from '../ui/GarmentVisual';
import { FlatLay } from '../art/FlatLay';
import { useWardrobe } from '../state/WardrobeProvider';
import { categoryLabel } from '../theme/tokens';
import { lastWornLabel } from '../lib/date';
import { ChevronIcon } from '../brand/icons';
import { Toast } from '../ui/Toast';

type Props = {
  garment: GarmentView | null;
  origin: 'closet' | 'stylist';
  onClose: () => void;
  onStyle: (id: string) => void;
};

/**
 * Paper garment sheet. From the stylist it is presented over the conversation
 * with a clear "back to chat" affordance; the chat itself is never unmounted.
 */
export function GarmentDetailModal({ garment, origin, onClose, onStyle }: Props) {
  const { boardsForGarment, garmentById, wornToday, logWear, demoCloset } = useWardrobe();
  const [toast, setToast] = useState<string | null>(null);

  if (!garment) return null;

  const boards: OutfitBoard[] = boardsForGarment(garment.id);
  const worn = wornToday.has(garment.id);

  const onWear = () => {
    const result = logWear([garment.id], 'item');
    if (result.logged.length > 0) setToast('worn today · logged once');
    else setToast('already logged today');
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={origin === 'stylist' ? 'back to chat' : 'back to closet'}
            onPress={onClose}
            style={styles.back}
            hitSlop={10}
          >
            <ChevronIcon direction="left" size={16} color={palette.ink} />
            <Text variant="meta" color={palette.ink}>
              {origin === 'stylist' ? 'back to chat' : 'back to closet'}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="close" onPress={onClose} hitSlop={12}>
            <Text variant="meta" color={palette.mutedInk}>
              close
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.hero, garment.cutoutUri ? { backgroundColor: palette.paperDeep } : null]}>
            <GarmentVisual garment={garment} width={garment.cutoutUri ? 260 : 220} height={260} />
          </View>

          <Text variant="micro" color={palette.mutedInk} style={styles.category}>
            {categoryLabel[garment.category]} · {garment.colorName}
            {garment.demo ? ' · demo piece' : ''}
          </Text>
          <Text variant="displaySmall" color={palette.ink} style={styles.name}>
            {garment.name}
          </Text>
          <Text variant="body" color={palette.mutedInk} style={styles.description}>
            {garment.description}
          </Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text variant="numeric" color={palette.ink}>
                {garment.wearCount}
              </Text>
              <Text variant="micro" color={palette.mutedInk}>
                {garment.wearCount === 1 ? 'wear' : 'wears'}
              </Text>
            </View>
            <View style={[styles.stat, styles.statMiddle]}>
              <Text
                variant="bodyStrong"
                color={garment.wearCount === 0 ? palette.never : palette.ink}
              >
                {lastWornLabel(garment.lastWornAt)}
              </Text>
              <Text variant="micro" color={palette.mutedInk} style={styles.statCaption}>
                last worn
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="micro" color={palette.mutedInk}>
              original outfits
            </Text>
            {boards.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boards}>
                {boards.map((board) => {
                  const pieces = board.itemIds
                    .map((id) => garmentById(id))
                    .filter((piece): piece is GarmentView => Boolean(piece));
                  return (
                    <View key={board.id} style={styles.board}>
                      {board.photoUri ? (
                        <Image source={{ uri: board.photoUri }} style={styles.boardImage} />
                      ) : (
                        <FlatLay garments={pieces} size={150} />
                      )}
                      <View style={styles.boardLabelRow}>
                        <Text variant="micro" color={palette.mutedInk}>
                          {board.photoUri ? 'your photo' : board.demo ? 'demo board' : 'outfit'}
                        </Text>
                        <Text variant="micro" color={palette.mutedInk}>
                          {board.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text variant="small" color={palette.mutedInk} style={styles.emptyBoards}>
                no original photo linked yet.
              </Text>
            )}
          </View>

          <Text variant="micro" color={palette.mutedInk} style={styles.note}>
            {demoCloset
              ? 'demo wardrobe · the cutouts are illustrations, not photos of your clothes.'
              : 'real cutout · stored on this device.'}
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={worn ? 'worn today ✓' : 'worn today'}
            onPress={onWear}
            disabled={worn}
            style={styles.footerButton}
          />
          <Button
            label="style this"
            variant="outlineInk"
            onPress={() => onStyle(garment.id)}
            style={styles.footerButton}
          />
        </View>
        <Toast message={toast} tone="paper" onDone={() => setToast(null)} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: palette.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: hairline,
    borderBottomColor: palette.paperLine,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
  hero: {
    backgroundColor: palette.paperRaised,
    borderWidth: hairline,
    borderColor: palette.paperLine,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginBottom: 22,
  },
  category: { marginBottom: 8 },
  name: { marginBottom: 10 },
  description: { maxWidth: 440 },
  stats: {
    flexDirection: 'row',
    marginTop: 24,
    borderTopWidth: hairline,
    borderBottomWidth: hairline,
    borderColor: palette.paperLine,
    paddingVertical: 16,
  },
  stat: { flex: 1 },
  statMiddle: { flex: 1.4, borderLeftWidth: hairline, borderLeftColor: palette.paperLine, paddingLeft: 18 },
  statCaption: { marginTop: 4 },
  section: { marginTop: 28 },
  boards: { gap: 14, paddingTop: 12, paddingRight: 8 },
  board: { width: 150 },
  boardImage: { width: 150, height: 150, backgroundColor: palette.paperDeep },
  boardLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, gap: 8 },
  emptyBoards: { marginTop: 10 },
  note: { marginTop: 30 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: hairline,
    borderTopColor: palette.paperLine,
    backgroundColor: palette.paper,
  },
  footerButton: { flex: 1 },
});
