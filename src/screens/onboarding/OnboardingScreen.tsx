import React, { useEffect, useMemo, useRef, useState, Dispatch, SetStateAction } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { Garment, GarmentView, OutfitBoard } from '../../types';
import { categoryLabel, categoryOrder, palette, hairline } from '../../theme/tokens';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { ProgressBar } from '../../ui/ProgressBar';
import { Chip } from '../../ui/Chip';
import { Sheet } from '../../ui/Sheet';
import { GarmentTile } from '../../ui/GarmentTile';
import { GarmentArt } from '../../art/GarmentArt';
import { CodedIntro, DriftingSplash } from './OnboardingIntro';
import { buildDemoCloset } from '../../data/demoCloset';
import { KIND_NOUN, KINDS_BY_CATEGORY, categoryOf } from '../../lib/garmentFacts';
import { accentFor, GARMENT_COLORWAYS } from '../../extraction/segment';
import { scanStageLabel } from '../../extraction/scan';
import { CUTOUT_STAGE_LABEL, CutoutFailure, CutoutStage, extractCutout, ExtractedPiece } from '../../extraction/cutout';
import { useWardrobe } from '../../state/WardrobeProvider';
import { useReducedMotion } from '../../theme/motion';

type Step = 'intro' | 'splash' | 'explain' | 'access' | 'scan' | 'photoScan' | 'review' | 'ready';
type Flow = 'demo' | 'photos';

/**
 * Required order: coded intro → splash → explanation → access → scan → review → ready.
 * The demo rack keeps its illustrated path. Real photos go through local
 * cutout extraction and arrive in the same review with generated titles.
 */
export function OnboardingScreen() {
  const { completeDemoCloset, completePhotoCloset } = useWardrobe();
  const reduced = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const [step, setStep] = useState<Step>('intro');
  const [keptIds, setKeptIds] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [flow, setFlow] = useState<Flow>('demo');
  const [photoItems, setPhotoItems] = useState<Garment[]>([]);
  const [photoBoards, setPhotoBoards] = useState<OutfitBoard[]>([]);
  const [photoFailures, setPhotoFailures] = useState<CutoutFailure[]>([]);
  const catalog = useMemo(() => buildDemoCloset(new Date()), []);
  const flowWidth = Math.min(windowWidth, 620);
  const innerWidth = flowWidth - 40;

  const beginDemoReview = () => {
    setFlow('demo');
    setKeptIds(catalog.garments.map((garment) => garment.id));
    setStep('review');
  };

  const beginPhotoReview = (items: Garment[], boards: OutfitBoard[], failures: CutoutFailure[]) => {
    setFlow('photos');
    setPhotoItems(items);
    setPhotoBoards(boards);
    setPhotoFailures(failures);
    setKeptIds(items.map((garment) => garment.id));
    setStep('review');
  };

  const openCloset = () => {
    if (flow === 'demo') {
      completeDemoCloset(keptIds);
      return;
    }
    const kept = new Set(keptIds);
    const garments = photoItems.filter((garment) => kept.has(garment.id));
    const boards = photoBoards
      .map((board) => ({ ...board, itemIds: board.itemIds.filter((id) => kept.has(id)) }))
      .filter((board) => board.itemIds.length > 0);
    completePhotoCloset(garments, boards);
  };

  if (step === 'intro') {
    return <CodedIntro onDone={() => setStep('splash')} />;
  }
  if (step === 'splash') {
    return <DriftingSplash onBegin={() => setStep('explain')} onSkip={() => setStep('explain')} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={[styles.column, { width: flowWidth }]}>
        {step === 'explain' ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.topRow}>
              <Text variant="micro" color={palette.mutedOnInk}>
                01 / getting dressed
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setStep('access')} hitSlop={12}>
                <Text variant="micro" color={palette.paper}>
                  skip
                </Text>
              </Pressable>
            </View>

            <Text variant="display" color={palette.paper} style={styles.display}>
              a closet that knows itself.
            </Text>
            <Text variant="body" color={palette.mutedOnInk} style={styles.introBody}>
              crest cuts each piece out of your photos, keeps the ones you actually wear, and builds outfits from
              that closet — nothing else.
            </Text>

            <View style={styles.points}>
              <Point index="01" title="every piece, on its own" body="tops, bottoms, layers, shoes, caps and bags are kept as separate garments." />
              <Point index="02" title="what you actually wear" body="wear counts update each time you log a look. the quiet pieces surface again." />
              <Point index="03" title="a stylist with nothing to sell" body="suggestions come from your closet. no prices, no closet value, no shopping." />
            </View>

            <Button label="continue" variant="solidPaper" onPress={() => setStep('access')} style={styles.primary} />
          </ScrollView>
        ) : null}

        {step === 'access' ? (
          <AccessStep
            onDemo={() => {
              setFlow('demo');
              setStep('scan');
            }}
            onPhotos={(selected) => {
              setFlow('photos');
              setPhotos(selected);
              setStep('photoScan');
            }}
            onBack={() => setStep('explain')}
          />
        ) : null}

        {step === 'scan' ? (
          <ScanStep
            catalog={catalog.garments}
            reduced={reduced}
            innerWidth={innerWidth}
            onReview={beginDemoReview}
            onSkip={() => setStep('review')}
          />
        ) : null}

        {step === 'photoScan' ? (
          <PhotoScanStep
            photos={photos}
            innerWidth={innerWidth}
            onBack={() => setStep('access')}
            onSetStep={setStep}
            onDemo={() => {
              setFlow('demo');
              setStep('scan');
            }}
            onReview={beginPhotoReview}
          />
        ) : null}

        {step === 'review' ? (
          <ReviewStep
            items={flow === 'photos' ? photoItems : catalog.garments}
            source={flow}
            keptIds={keptIds}
            setKeptIds={setKeptIds}
            innerWidth={innerWidth}
            onUpdateItem={
              flow === 'photos'
                ? (id, patch) =>
                    setPhotoItems((current) =>
                      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
                    )
                : undefined
            }
            onContinue={() => setStep('ready')}
          />
        ) : null}

        {step === 'ready' ? (
          <ReadyStep
            keptIds={keptIds}
            items={flow === 'photos' ? photoItems : catalog.garments}
            source={flow}
            failures={photoFailures.length}
            onOpen={openCloset}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Point({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <View style={styles.point}>
      <Text variant="micro" color={palette.mutedOnInk} style={styles.pointIndex}>
        {index}
      </Text>
      <View style={styles.pointBody}>
        <Text variant="bodyStrong" color={palette.paper}>
          {title}
        </Text>
        <Text variant="small" color={palette.mutedOnInk} style={styles.pointCopy}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function AccessStep({
  onDemo,
  onPhotos,
  onBack,
}: {
  onDemo: () => void;
  onPhotos: (photos: string[]) => void;
  onBack: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [limited, setLimited] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openPhotos = async () => {
    setBusy(true);
    setError(null);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setCanAskAgain(permission.canAskAgain !== false);
        if (!permission.granted) {
          setDenied(true);
          setLimited(permission.accessPrivileges === 'limited');
          return;
        }
        if (permission.accessPrivileges === 'limited') setLimited(true);
      }        const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 12,
        quality: 0.85,
      });
      if (!result.canceled && result.assets.length > 0) {
        onPhotos(result.assets.map((asset) => asset.uri));
      }
    } catch {
      setError('we couldn’t open your photos. try again, or use the demo closet.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={12}>
          <Text variant="micro" color={palette.mutedOnInk}>
            back
          </Text>
        </Pressable>
        <Text variant="micro" color={palette.mutedOnInk}>
          02 / access
        </Text>
      </View>

      <Text variant="display" color={palette.paper} style={styles.display}>
        let’s see the closet.
      </Text>
      <Text variant="body" color={palette.mutedOnInk} style={styles.introBody}>
        choose up to 12 clear photos, one piece per photo, on a surface that contrasts with the fabric. crest cuts
        each piece out on this device and gives it a title.
      </Text>

      {limited ? (
        <View style={styles.notice}>
          <Text variant="small" color={palette.paper}>
            limited photo access is on. that works — you can choose the photos you want to share, and add more later
            in settings.
          </Text>
        </View>
      ) : null}

      {denied ? (
        <View style={styles.notice}>
          <Text variant="bodyStrong" color={palette.paper}>
            photos are off.
          </Text>
          <Text variant="small" color={palette.mutedOnInk} style={styles.noticeBody}>
            you can still explore a complete demo closet. if you want to use your own photos, allow access in settings.
          </Text>
          <View style={styles.noticeActions}>
            {canAskAgain ? (
              <Button label="try again" variant="outlinePaper" size="md" onPress={openPhotos} />
            ) : (
              <Button
                label="open settings"
                variant="outlinePaper"
                size="md"
                onPress={() => {
                  void Linking.openSettings();
                }}
              />
            )}
          </View>
        </View>
      ) : null}

      {error ? (
        <Text variant="small" color={palette.never} style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        label={busy ? 'opening photos…' : 'use my photos'}
        variant="solidPaper"
        onPress={openPhotos}
        disabled={busy}
        style={styles.primary}
      />
      <Button label="try the demo closet" variant="outlinePaper" onPress={onDemo} style={styles.secondary} />
      <Text variant="micro" color={palette.mutedOnInk} style={styles.finePrint}>
        photos are processed on this device and never uploaded. cutouts work best on a plain, contrasting surface
        with the whole garment in frame. the demo is 188 illustrated pieces, labelled demo everywhere.
      </Text>
    </ScrollView>
  );
}

function ScanStep({
  catalog,
  reduced,
  innerWidth,
  onReview,
  onSkip,
}: {
  catalog: Garment[];
  reduced: boolean;
  innerWidth: number;
  onReview: () => void;
  onSkip: () => void;
}) {
  const total = catalog.length;
  const mixed = useMemo(() => {
    const buckets = categoryOrder.map((category) => catalog.filter((garment) => garment.category === category));
    const result: Garment[] = [];
    for (let row = 0; result.length < catalog.length; row += 1) {
      buckets.forEach((bucket) => {
        if (bucket[row]) result.push(bucket[row]);
      });
    }
    return result;
  }, [catalog]);
  const [arrived, setArrived] = useState(reduced ? total : 0);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => {
      setArrived((current) => {
        if (current >= total) return current;
        return Math.min(total, current + 8);
      });
    }, 100);
    return () => clearInterval(timer);
  }, [reduced, total]);

  const done = arrived >= total;
  const progress = total === 0 ? 1 : arrived / total;
  const visible = mixed.slice(Math.max(0, arrived - 12), arrived);
  const padded: (Garment | null)[] = [
    ...visible,
    ...Array.from({ length: Math.max(0, 12 - visible.length) }, () => null),
  ];

  const gridWidth = Math.min(innerWidth, 360);
  const cellWidth = Math.floor((gridWidth - 3 * 8) / 4);
  const cellHeight = Math.round(cellWidth * 1.16);

  return (
    <View style={styles.scan}>
      <View style={styles.topRow}>
        <Text variant="micro" color={palette.mutedOnInk}>
          03 / scan
        </Text>
        <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={12}>
          <Text variant="micro" color={palette.mutedOnInk}>
            skip scan
          </Text>
        </Pressable>
      </View>

      <Text variant="display" color={palette.paper} style={styles.displaySmaller}>
        scanning the demo rack.
      </Text>
      <View style={styles.demoLine}>
        <View style={styles.demoDot} />
        <Text variant="micro" color={palette.mutedOnInk}>
          demo rack · these pieces are not from your photos
        </Text>
      </View>

      <View style={[styles.scanGrid, { width: gridWidth }]}>
        {padded.map((garment, index) =>
          garment ? (
            <View
              key={`${garment.id}-${index}`}
              style={[styles.scanCell, { width: cellWidth, height: cellHeight }]}
            >
              <GarmentArt
                kind={garment.kind}
                color={garment.color}
                accent={garment.accent}
                width={cellWidth * 0.82}
                height={cellHeight * 0.9}
              />
            </View>
          ) : (
            <View
              key={`empty-${index}`}
              style={[styles.scanCell, styles.scanCellEmpty, { width: cellWidth, height: cellHeight }]}
            />
          ),
        )}
      </View>

      <View style={styles.scanStatus}>
        <ProgressBar
          progress={progress}
          color={palette.paper}
          track={palette.inkLine}
          style={styles.progress}
          height={2}
        />
        <View style={styles.scanMetaRow}>
          <Text variant="micro" color={palette.paper}>
            {done ? 'rack sorted' : scanStageLabel(progress)}
          </Text>
          <Text variant="micro" color={palette.mutedOnInk}>
            {arrived} / {total}
          </Text>
        </View>
      </View>

      <View style={styles.scanFooter}>
        <Button
          label={done ? `review ${total} pieces` : 'sorting…'}
          variant="solidPaper"
          onPress={onReview}
          disabled={!done}
        />
      </View>
    </View>
  );
}

function ReviewStep({
  items,
  source,
  keptIds,
  setKeptIds,
  innerWidth,
  onUpdateItem,
  onContinue,
}: {
  items: Garment[];
  source: Flow;
  keptIds: string[];
  setKeptIds: (ids: string[]) => void;
  innerWidth: number;
  onUpdateItem?: (id: string, patch: Partial<Garment>) => void;
  onContinue: () => void;
}) {
  const kept = new Set(keptIds);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const editing = editingId ? items.find((item) => item.id === editingId) ?? null : null;
  const editingKept = editing ? kept.has(editing.id) : false;
  const removed = items.length - keptIds.length;
  const columns = innerWidth >= 520 ? 4 : 3;
  const gap = 12;
  const tileWidth = Math.floor((innerWidth - gap * (columns - 1)) / columns);
  const counts = categoryOrder
    .map((category) => ({
      category,
      count: items.filter((garment) => garment.category === category && kept.has(garment.id)).length,
    }))
    .filter((entry) => entry.count > 0);

  // A correction to type or colour rewrites the automatic title too, unless the
  // title was typed by hand.
  const retitle = (garment: Garment, patch: Partial<Garment>): Partial<Garment> => {
    const next: Partial<Garment> = { ...patch };
    const colorName = patch.colorName ?? garment.colorName;
    const kind = patch.kind ?? garment.kind;
    if (garment.name === `${garment.colorName} ${KIND_NOUN[garment.kind]}`) {
      next.name = `${colorName} ${KIND_NOUN[kind]}`;
    }
    next.description = `cut from your photo on this device. you set the type to ${KIND_NOUN[kind]} and the colour to ${colorName}.`;
    return next;
  };

  return (
    <View style={styles.review}>
      <View style={styles.reviewHeader}>
        <View style={styles.topRow}>
          <Text variant="micro" color={palette.mutedOnInk}>
            04 / review
          </Text>
          <Text variant="micro" color={palette.mutedOnInk}>
            {source === 'demo' ? 'demo rack · not from your photos' : 'from your photos · cut out on this device'}
          </Text>
        </View>
        <Text variant="display" color={palette.paper} style={styles.displaySmaller}>
          {keptIds.length} {keptIds.length === 1 ? 'piece' : 'pieces'}.
        </Text>
        <Text variant="small" color={palette.mutedOnInk} style={styles.reviewCopy}>
          {source === 'demo'
            ? 'tap any piece to remove a wrong cutout. everything kept becomes the demo closet.'
            : 'tap a cutout to fix its title, type or colour, or remove it. automatic titles come from colour and shape.'}
        </Text>
        <Text variant="micro" color={palette.mutedOnInk} style={styles.reviewCounts}>
          {counts.map((entry) => `${categoryLabel[entry.category]} ${entry.count}`).join(' · ')}
        </Text>
      </View>

      <FlatList
        key={`review-${columns}`}
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={styles.reviewGrid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isKept = kept.has(item.id);
          return (
            <GarmentTile
              garment={item as GarmentView}
              width={tileWidth}
              tone="ink"
              selected={isKept}
              onPress={() => {
                if (source === 'photos') {
                  setEditingId(item.id);
                  setDraftName(item.name);
                  return;
                }
                if (isKept) setKeptIds(keptIds.filter((id) => id !== item.id));
                else setKeptIds([...keptIds, item.id]);
              }}
              accessibilityLabel={
                source === 'photos'
                  ? `${item.name}, edit title and type`
                  : `${item.name}, ${isKept ? 'kept, tap to remove' : 'removed, tap to keep'}`
              }
            />
          );
        }}
      />

      <View style={styles.reviewFooter}>
        <Text variant="micro" color={palette.mutedOnInk}>
          {removed > 0 ? `${removed} removed` : 'nothing removed'} · {keptIds.length} kept
        </Text>
        <Button
          label={`keep ${keptIds.length} ${keptIds.length === 1 ? 'piece' : 'pieces'}`}
          variant="solidPaper"
          onPress={onContinue}
          disabled={keptIds.length === 0}
          style={styles.reviewButton}
        />
      </View>

      {source === 'photos' ? (
        <Sheet visible={Boolean(editing)} onClose={() => setEditingId(null)} title="cutout" tone="ink">
          {editing ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.editTop}>
                <View style={styles.editPreview}>
                  <Image
                    source={{ uri: editing.cutoutUri }}
                    style={styles.editPreviewImage}
                    resizeMode="contain"
                    accessibilityLabel={`${editing.name} cutout`}
                  />
                </View>
                <View style={styles.editBody}>
                  <Text variant="micro" color={palette.mutedOnInk}>
                    title
                  </Text>
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="name this piece"
                    placeholderTextColor={palette.mutedOnInk}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.editInput}
                    accessibilityLabel="cutout title"
                  />
                  <Text variant="micro" color={palette.mutedOnInk} style={styles.editHint}>
                    auto-titled from the cutout’s colour and shape. edit it if you know better.
                  </Text>
                </View>
              </View>

              <Text variant="micro" color={palette.mutedOnInk} style={styles.editTypeLabel}>
                type
              </Text>
              <View style={styles.editChips}>
                {categoryOrder.map((category) => (
                  <Chip
                    key={category}
                    label={category}
                    tone="ink"
                    active={editing.category === category}
                    onPress={() => {
                      const kind = KINDS_BY_CATEGORY[category][0];
                      const patch = retitle(editing, { category, kind });
                      if (patch.name) setDraftName(patch.name);
                      onUpdateItem?.(editing.id, patch);
                    }}
                  />
                ))}
              </View>
              {editing.category === 'bottoms' || editing.category === 'tops' || editing.category === 'shoes' || editing.category === 'jackets' ? (
                <>
                  <Text variant="micro" color={palette.mutedOnInk} style={styles.editTypeLabel}>
                    piece
                  </Text>
                  <View style={styles.editChips}>
                    {KINDS_BY_CATEGORY[editing.category].map((kind) => (
                      <Chip
                        key={kind}
                        label={KIND_NOUN[kind]}
                        tone="ink"
                        active={editing.kind === kind}
                        accessibilityLabel={`${KIND_NOUN[kind]}, ${editing.kind === kind ? 'selected' : 'use this type'}`}
                        onPress={() => {
                          const patch = retitle(editing, { kind, category: categoryOf(kind) });
                          if (patch.name) setDraftName(patch.name);
                          onUpdateItem?.(editing.id, patch);
                        }}
                      />
                    ))}
                  </View>
                </>
              ) : null}
              <Text variant="micro" color={palette.mutedOnInk} style={styles.editTypeLabel}>
                colour
              </Text>
              <View style={styles.editChips}>
                {GARMENT_COLORWAYS.map((colorway) => (
                  <Chip
                    key={colorway.name}
                    label={colorway.name}
                    tone="ink"
                    active={editing.colorName === colorway.name}
                    accessibilityLabel={`${colorway.name}${editing.colorName === colorway.name ? ', selected' : ''}`}
                    onPress={() => {
                      const patch = retitle(editing, {
                        colorName: colorway.name,
                        color: colorway.hex,
                        accent: accentFor(colorway.hex),
                        colorFamily: colorway.family,
                      });
                      if (patch.name) setDraftName(patch.name);
                      onUpdateItem?.(editing.id, patch);
                    }}
                  />
                ))}
              </View>
              <Text variant="micro" color={palette.mutedOnInk} style={styles.editHint}>
                type and colour change how the stylist uses the piece. the cutout stays the same.
              </Text>

              <Button
                label="save title"
                variant="solidPaper"
                onPress={() => {
                  onUpdateItem?.(editing.id, { name: draftName.trim() || editing.name });
                  setEditingId(null);
                }}
                style={styles.editSave}
              />
              <Button
                label={editingKept ? 'remove from this scan' : 'keep this piece'}
                variant="outlinePaper"
                onPress={() => {
                  if (editingKept) setKeptIds(keptIds.filter((id) => id !== editing.id));
                  else setKeptIds([...keptIds, editing.id]);
                  setEditingId(null);
                }}
                style={styles.editRemove}
              />
            </ScrollView>
          ) : null}
        </Sheet>
      ) : null}
    </View>
  );
}

function PhotoScanStep({
  photos,
  innerWidth,
  onBack,
  onSetStep,
  onDemo,
  onReview,
}: {
  photos: string[];
  innerWidth: number;
  onBack: () => void;
  onSetStep: Dispatch<SetStateAction<'intro' | 'splash' | 'explain' | 'access' | 'scan' | 'photoScan' | 'review' | 'ready'>>;
  onDemo: () => void;
  onReview: (items: Garment[], boards: OutfitBoard[], failures: CutoutFailure[]) => void;
}) {
  const [items, setItems] = useState<Garment[]>([]);
  const [boards, setBoards] = useState<OutfitBoard[]>([]);
  const [failures, setFailures] = useState<CutoutFailure[]>([]);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<CutoutStage>('reading');
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    const createdItems: Garment[] = [];
    const createdBoards: OutfitBoard[] = [];
    const createdFailures: CutoutFailure[] = [];

    const run = async () => {
      for (let i = 0; i < photos.length; i += 1) {
        if (cancelled) return;
        setIndex(i);
        setStage('reading');
        const result = await extractCutout(photos[i], {
          onStage: (nextStage) => {
            if (!cancelled) setStage(nextStage);
          },
        });
        if (cancelled) return;

        if (result.ok) {
          const piece: ExtractedPiece = result.piece;
          const stamp = Date.now().toString(36);
          const boardId = `photo-board-${stamp}-${i}`;
          const garment: Garment = {
            id: `photo-${stamp}-${i}-${Math.random().toString(36).slice(2, 5)}`,
            name: piece.name,
            category: piece.category,
            kind: piece.kind,
            colorName: piece.colorName,
            color: piece.color,
            accent: piece.accent,
            colorFamily: piece.colorFamily,
            description: piece.description,
            addedAt: new Date().toISOString(),
            sourceOutfitIds: [boardId],
            demo: false,
            cutoutUri: piece.cutoutUri,
          };
          const board: OutfitBoard = {
            id: boardId,
            label: `photo ${String(i + 1).padStart(2, '0')}`,
            itemIds: [garment.id],
            demo: false,
            photoUri: piece.sourcePhotoUri ?? undefined,
          };
          createdItems.push(garment);
          createdBoards.push(board);
          setItems([...createdItems]);
          setBoards([...createdBoards]);
        } else {
          createdFailures.push(result.failure);
          setFailures([...createdFailures]);
        }
        setIndex(i + 1);
      }
      if (!cancelled) setDone(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  const columns = innerWidth >= 520 ? 4 : 3;
  const gap = 10;
  const cellWidth = Math.floor((Math.min(innerWidth, 380) - gap * (columns - 1)) / columns);
  const progress = done ? 1 : photos.length === 0 ? 1 : index / photos.length;
  const currentPhoto = photos[Math.min(index, photos.length - 1)];

  return (
    <View style={styles.photoScan}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={12}>
          <Text variant="micro" color={palette.mutedOnInk}>
            back
          </Text>
        </Pressable>
        <Text variant="micro" color={palette.mutedOnInk}>
          03 / scan · on device
        </Text>
      </View>

      <Text variant="display" color={palette.paper} style={styles.displaySmaller}>
        {done
          ? items.length > 0
            ? `${items.length} ${items.length === 1 ? 'cutout' : 'cutouts'}.`
            : 'no clean cutouts yet.'
          : 'cutting out the pieces.'}
      </Text>
      <Text variant="small" color={palette.mutedOnInk} style={styles.photoScanCopy}>
        {done
          ? items.length > 0
            ? 'each photo was cropped to its piece with a small border and titled from its colour and shape. review them before they go in.'
            : 'nothing was added. try photos with one piece on a surface that contrasts with the fabric.'
          : 'the photo stays on this device. we find the garment, crop to it, and read its colour and shape.'}
      </Text>

      <ScrollView
        style={styles.photoScanScroll}
        contentContainerStyle={styles.photoScanGrid}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, itemIndex) => (
          <View key={item.id} style={{ width: cellWidth }}>
            <View style={[styles.cutoutCell, { width: cellWidth, height: cellWidth, backgroundColor: palette.paperDeep }]}>
              <Image
                source={{ uri: item.cutoutUri }}
                style={{ width: cellWidth * 0.92, height: cellWidth * 0.92 }}
                resizeMode="contain"
                accessibilityLabel={`${item.name} cutout`}
              />
            </View>
            <Text variant="meta" color={palette.paper} numberOfLines={2} style={styles.cutoutName}>
              {item.name}
            </Text>
            <Text variant="micro" color={palette.mutedOnInk}>
              photo {String(itemIndex + 1).padStart(2, '0')}
            </Text>
          </View>
        ))}
        {!done && items.length === 0 ? (
          <View style={styles.scanningPreview}>
            {currentPhoto ? (
              <Image source={{ uri: currentPhoto }} style={styles.scanningPhoto} resizeMode="cover" />
            ) : null}
            <Text variant="small" color={palette.mutedOnInk} style={styles.scanningCopy}>
              {CUTOUT_STAGE_LABEL[stage]}…
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {failures.length > 0 ? (
        <Text variant="micro" color={palette.mutedOnInk} style={styles.failureNote}>
          {failures.length} {failures.length === 1 ? 'photo was' : 'photos were'} left out. {failures[0].message}
        </Text>
      ) : null}

      <View style={styles.photoScanFooter}>
        <ProgressBar progress={progress} color={palette.paper} track={palette.inkLine} height={2} />
        <View style={styles.scanMetaRow}>
          <Text variant="micro" color={palette.paper}>
            {done ? 'cutouts ready' : CUTOUT_STAGE_LABEL[stage]}
          </Text>
          <Text variant="micro" color={palette.mutedOnInk}>
            {Math.min(index, photos.length)} / {photos.length}
          </Text>
        </View>

        {done && items.length > 0 ? (
          <>
            <Button
              label={`review ${items.length} ${items.length === 1 ? 'cutout' : 'cutouts'}`}
              variant="solidPaper"
              onPress={() => onReview(items, boards, failures)}
              style={styles.photoScanButton}
            />
            <Button
              label="add more"
              variant="outlinePaper"
              onPress={() => onSetStep('access')}
              style={styles.photoScanSecondary}
            />
          </>
        ) : done ? (
          <>
            <Button label="choose different photos" variant="solidPaper" onPress={onBack} style={styles.photoScanButton} />
            <Button label="try the demo closet" variant="outlinePaper" onPress={onDemo} style={styles.photoScanSecondary} />
          </>
        ) : null}
      </View>
    </View>
  );
}

function ReadyStep({
  keptIds,
  items,
  source,
  failures,
  onOpen,
}: {
  keptIds: string[];
  items: Garment[];
  source: Flow;
  failures: number;
  onOpen: () => void;
}) {
  const kept = new Set(keptIds);
  const counts = categoryOrder
    .map((category) => ({
      category,
      count: items.filter((garment) => garment.category === category && kept.has(garment.id)).length,
    }))
    .filter((entry) => entry.count > 0);

  return (
    <View style={styles.ready}>
      <Text variant="micro" color={palette.mutedOnInk}>
        05 / ready
      </Text>
      <View style={styles.readyCenter}>
        <Text variant="display" color={palette.paper}>
          closet ready.
        </Text>
        <Text variant="body" color={palette.mutedOnInk} style={styles.readyBody}>
          {keptIds.length} {keptIds.length === 1 ? 'piece' : 'pieces'}, sorted. the stylist will use only these.
        </Text>
        <View style={styles.readyCounts}>
          {counts.map((entry) => (
            <View key={entry.category} style={styles.readyCount}>
              <Text variant="numeric" color={palette.paper}>
                {entry.count}
              </Text>
              <Text variant="micro" color={palette.mutedOnInk}>
                {categoryLabel[entry.category]}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View>
        <Button label="open closet" variant="solidPaper" onPress={onOpen} />
        <Text variant="micro" color={palette.mutedOnInk} style={styles.readyNote}>
          {source === 'demo'
            ? 'demo pieces are labelled throughout. you can log a wear, open a garment, or ask the stylist anything.'
            : `real cutouts, stored on this device.${failures > 0 ? ` ${failures} ${failures === 1 ? 'photo was' : 'photos were'} left out.` : ''} you can log a wear, open a piece, or ask the stylist anything.`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ink },
  column: { flex: 1, alignSelf: 'center', width: '100%' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  display: { marginTop: 26, maxWidth: 480 },
  displaySmaller: { marginTop: 18 },
  introBody: { marginTop: 14, maxWidth: 460 },
  points: { marginTop: 34, gap: 24 },
  point: { flexDirection: 'row', gap: 16, borderTopWidth: hairline, borderTopColor: palette.inkLine, paddingTop: 16 },
  pointIndex: { width: 22 },
  pointBody: { flex: 1 },
  pointCopy: { marginTop: 5, maxWidth: 400 },
  primary: { marginTop: 34 },
  secondary: { marginTop: 10 },
  finePrint: { marginTop: 18, maxWidth: 420 },
  notice: {
    borderWidth: hairline,
    borderColor: palette.inkLine,
    padding: 14,
    marginTop: 22,
  },
  noticeBody: { marginTop: 6 },
  noticeActions: { flexDirection: 'row', marginTop: 12 },
  error: { marginTop: 16 },
  scan: { flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  demoLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  demoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.paper },
  scanGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 22, alignSelf: 'center' },
  scanCell: {
    backgroundColor: palette.paperRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanCellEmpty: { backgroundColor: palette.inkRaised, borderWidth: hairline, borderColor: palette.inkLine },
  scanStatus: { marginTop: 'auto', paddingTop: 24 },
  progress: { marginBottom: 10 },
  scanMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scanFooter: { paddingTop: 18, paddingBottom: 4 },
  review: { flex: 1 },
  reviewHeader: { paddingHorizontal: 20, paddingTop: 14 },
  reviewCopy: { marginTop: 8, maxWidth: 440 },
  reviewCounts: { marginTop: 10 },
  reviewGrid: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 18 },
  reviewFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.ink,
    borderTopWidth: hairline,
    borderTopColor: palette.inkLine,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  reviewButton: { width: '100%' },
  photoScan: { flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  photoScanCopy: { marginTop: 10, maxWidth: 470 },
  photoScanScroll: { flex: 1, marginTop: 18 },
  photoScanGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12 },
  cutoutCell: {
    backgroundColor: palette.paperRaised,
    borderWidth: hairline,
    borderColor: palette.inkLine,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cutoutName: { marginTop: 6, minHeight: 30 },
  scanningPreview: { width: '100%', paddingTop: 16, alignItems: 'flex-start' },
  scanningPhoto: { width: 128, height: 160, backgroundColor: palette.inkRaised },
  scanningCopy: { marginTop: 10 },
  failureNote: { marginTop: 8, maxWidth: 470 },
  photoScanFooter: { paddingTop: 10, borderTopWidth: hairline, borderTopColor: palette.inkLine },
  photoScanButton: { marginTop: 12 },
  photoScanSecondary: { marginTop: 8 },
  editTop: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  editPreview: {
    width: 104,
    height: 104,
    backgroundColor: palette.paperRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPreviewImage: { width: 96, height: 96 },
  editBody: { flex: 1 },
  editInput: {
    height: 44,
    borderWidth: hairline,
    borderColor: palette.inkLine,
    color: palette.paper,
    paddingHorizontal: 12,
    marginTop: 6,
    fontSize: 15,
  },
  editHint: { marginTop: 8, maxWidth: 420 },
  editTypeLabel: { marginTop: 4 },
  editChips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  editSave: { marginTop: 12 },
  editRemove: { marginTop: 8 },
  ready: { flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, justifyContent: 'space-between' },
  readyCenter: { flex: 1, justifyContent: 'center', paddingBottom: 30 },
  readyBody: { marginTop: 12, maxWidth: 320 },
  readyCounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, marginTop: 30 },
  readyCount: { minWidth: 58 },
  readyNote: { marginTop: 12, maxWidth: 380 },
});
