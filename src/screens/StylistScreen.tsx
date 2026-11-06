import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatMessage, ProposedLook, WeatherKey } from '../types';
import { palette, hairline } from '../theme/tokens';
import { Text } from '../ui/Text';
import { Chip } from '../ui/Chip';
import { LookCard } from '../ui/LookCard';
import { PackingCard } from '../ui/PackingCard';
import { ChatComposer } from '../ui/ChatComposer';
import { Sheet } from '../ui/Sheet';
import { Toast } from '../ui/Toast';
import { GarmentDetailModal } from './GarmentDetailScreen';
import { useWardrobe } from '../state/WardrobeProvider';
import { composeLooks, respond } from '../stylist/stylistEngine';
import { startVoice, voiceAvailable } from '../lib/voice';
import { GarmentVisual } from '../ui/GarmentVisual';

type Props = {
  pendingAnchorId: string | null;
  onConsumeAnchor: () => void;
};

const OPENING_CHIPS = [
  'what should i wear for dinner?',
  'build a look around my black jacket',
  "what haven't i worn lately?",
  'do i own something similar?',
  'pack for five days',
];

const COMPOSING_PATTERN = /wear|look|outfit|style|dress|dinner|work|pack|build|shuffle|warmer|casual|formal|trip|surprise|another/i;

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Conversation first. The stylist works only from the closet on this device. */
export function StylistScreen({ pendingAnchorId, onConsumeAnchor }: Props) {
  const {
    messages,
    context,
    weather,
    garmentViews,
    garmentById,
    wornToday,
    demoCloset,
    appendMessage,
    updateMessage,
    setContext,
    setWeather,
    logWear,
    toggleSavedLook,
    savedLookByKey,
  } = useWardrobe();

  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const offsetRef = useRef(0);
  const stopVoiceRef = useRef<(() => void) | null>(null);

  const [input, setInput] = useState('');
  const [composingStage, setComposingStage] = useState<string | null>(null);
  const [sheetGarmentId, setSheetGarmentId] = useState<string | null>(null);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [voiceUsed, setVoiceUsed] = useState(false);

  const cardWidth = Math.min(windowWidth, 620) - 40;

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'stylist') {
      // FlatList rows are virtualised; aligning the new reply by index shows its
      // opening line and first look instead of landing at the top of the feed.
      const index = messages.length - 1;
      const timer = setTimeout(() => {
        listRef.current?.scrollToIndex({ index, viewPosition: 0, animated: true });
      }, 160);
      return () => clearTimeout(timer);
    }
    scrollToEnd(messages.length > 1);
  }, [messages.length, scrollToEnd]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => scrollToEnd());
    return () => show.remove();
  }, [scrollToEnd]);

  useEffect(
    () => () => {
      stopVoiceRef.current?.();
      stopVoiceRef.current = null;
    },
    [],
  );

  const replyTo = useCallback(
    (text: string, anchors?: string[]) => {
      const result = respond(text, {
        garments: garmentViews,
        context,
        weather,
        anchorOverride: anchors,
      });
      const reply = result.reply;
      const message: ChatMessage = {
        id: createId('stylist'),
        role: 'stylist',
        text: reply.text,
        chips: reply.chips,
        looks: reply.kind === 'looks' ? reply.looks : undefined,
        lookRequest: result.lookRequest,
        pieces: reply.kind === 'message' ? reply.pieces : undefined,
        packing: reply.kind === 'packing' ? reply.plan : undefined,
        createdAt: new Date().toISOString(),
      };
      appendMessage(message);
      setContext(result.context);
      setComposingStage(null);
    },
    [appendMessage, context, garmentViews, setContext, weather],
  );

  const send = useCallback(
    (raw: string, anchors?: string[], spoken = false) => {
      const text = raw.trim();
      if ((!text && !anchors?.length) || composingStage) return;
      const userMessage: ChatMessage = {
        id: createId('you'),
        role: 'user',
        text: [text || 'style this'],
        viaVoice: spoken,
        createdAt: new Date().toISOString(),
      };
      appendMessage(userMessage);
      setInput('');
      setTranscript(null);
      setVoiceUsed(false);
      setVoiceNote(null);
      Keyboard.dismiss();

      const wantsComposition = COMPOSING_PATTERN.test(text) || Boolean(anchors?.length);
      if (!wantsComposition) {
        setTimeout(() => replyTo(text, anchors), 280);
        return;
      }

      setComposingStage('looking through your closet');
      setTimeout(() => setComposingStage('putting it together'), 640);
      setTimeout(() => replyTo(text, anchors), 1180);
    },
    [appendMessage, composingStage, replyTo],
  );

  useEffect(() => {
    if (!pendingAnchorId) return;
    send('style this', [pendingAnchorId]);
    onConsumeAnchor();
    // send is stable enough for this one-shot handoff
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnchorId]);

  const closeSheet = () => {
    setSheetGarmentId(null);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: offsetRef.current, animated: false });
    });
  };

  const changeLook = (message: ChatMessage, look: ProposedLook, mode: 'shuffle' | 'dislike') => {
    const request =
      message.lookRequest ?? {
        occasion: context.occasion ?? 'none',
        anchorIds: context.anchorIds,
        salt: 1,
        weather,
      };
    const current = message.looks ?? [];
    const nextSalt = request.salt + 1;
    const candidates = composeLooks(garmentViews, { ...request, salt: nextSalt }, {
      count: 4,
      excludeKeys: current.map((entry) => entry.key),
    });
    const replacement = candidates[0];
    if (!replacement) {
      setToast('no other combination in the closet yet');
      return;
    }
    const looks = current.map((entry) =>
      entry.key === look.key ? { ...replacement, title: look.title } : entry,
    );
    updateMessage(message.id, { looks, lookRequest: { ...request, salt: nextSalt } });
    setContext({
      lastLookKeys: [...context.lastLookKeys, replacement.key].slice(-6),
      dislikedLookKeys:
        mode === 'dislike'
          ? [...context.dislikedLookKeys, look.key].slice(-8)
          : context.dislikedLookKeys,
    });
    setToast(mode === 'dislike' ? 'noted. here’s another.' : 'another pass.');
  };

  const onWear = (look: ProposedLook) => {
    const result = logWear(look.itemIds, 'look');
    setToast(
      result.logged.length > 0
        ? `worn today · ${result.logged.length} ${result.logged.length === 1 ? 'piece' : 'pieces'} logged`
        : 'this look is already logged today',
    );
  };

  const onSave = (look: ProposedLook) => {
    const saved = toggleSavedLook(look, demoCloset);
    setToast(saved ? 'saved to you' : 'removed from saved');
  };

  const toggleVoice = () => {
    if (listening) {
      stopVoiceRef.current?.();
      stopVoiceRef.current = null;
      setListening(false);
      return;
    }
    if (!voiceAvailable()) {
      setVoiceNote(
        Platform.OS === 'web'
          ? 'this browser doesn’t expose speech recognition. type the request instead.'
          : 'voice input needs the web app in this build. type the request for now.',
      );
      return;
    }
    setTranscript(null);
    setVoiceNote(null);
    const stop = startVoice({
      onTranscript: (text, final) => {
        setTranscript(text);
        setInput(text);
        setVoiceUsed(true);
        if (final) {
          setListening(false);
          stopVoiceRef.current = null;
        }
      },
      onEnd: () => {
        setListening(false);
        stopVoiceRef.current = null;
      },
      onError: (message) => setVoiceNote(message),
    });
    if (stop) {
      stopVoiceRef.current = stop;
      setListening(true);
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isStylist = item.role === 'stylist';
    const lastStylist = index === messages.length - 1;
    if (!isStylist) {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text variant="body" color={palette.ink}>
              {item.text.join(' ')}
            </Text>
            {item.viaVoice ? (
              <Text variant="micro" color={palette.mutedInk} style={styles.spoken}>
                spoken
              </Text>
            ) : null}
          </View>
        </View>
      );
    }

    const pieces = (item.pieces ?? [])
      .map((id) => garmentById(id))
      .filter((garment): garment is NonNullable<typeof garment> => Boolean(garment));

    return (
      <View style={styles.stylistBlock}>
        {item.text.map((line, lineIndex) => (
          <Text
            key={`${item.id}-line-${lineIndex}`}
            variant="body"
            color={palette.paper}
            style={lineIndex > 0 ? styles.line : undefined}
          >
            {line}
          </Text>
        ))}

        {pieces.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pieces}
            style={styles.piecesScroll}
          >
            {pieces.map((garment) => (
              <Pressable
                key={garment.id}
                onPress={() => setSheetGarmentId(garment.id)}
                accessibilityRole="button"
                accessibilityLabel={`${garment.name}, open details`}
                style={styles.piece}
              >
                <View
                  style={[
                    styles.pieceArt,
                    { backgroundColor: garment.cutoutUri ? palette.paperDeep : palette.paper },
                  ]}
                >
                  <GarmentVisual garment={garment} width={76} height={82} />
                </View>
                <Text variant="micro" color={palette.paper} numberOfLines={2} style={styles.pieceName}>
                  {garment.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {item.looks?.map((look) => (
          <LookCard
            key={look.key}
            look={look}
            garments={garmentViews}
            width={cardWidth}
            saved={Boolean(savedLookByKey(look.key))}
            wornToday={look.itemIds.length > 0 && look.itemIds.every((id) => wornToday.has(id))}
            onSave={() => onSave(look)}
            onShuffle={() => changeLook(item, look, 'shuffle')}
            onDislike={() => changeLook(item, look, 'dislike')}
            onWear={() => onWear(look)}
            onOpenGarment={(id) => setSheetGarmentId(id)}
          />
        ))}

        {item.packing ? (
          <PackingCard
            plan={item.packing}
            garments={garmentViews}
            width={cardWidth}
            onOpenGarment={(id) => setSheetGarmentId(id)}
          />
        ) : null}

        {lastStylist && item.chips?.length ? (
          <View style={styles.chips}>
            {item.chips.map((chip) => (
              <Chip key={chip} label={chip} onPress={() => send(chip)} />
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  const opening = (
    <View style={styles.opening}>
      <Text variant="display" color={palette.paper}>
        good afternoon.
      </Text>
      <Text variant="display" color={palette.paper} style={styles.openingSecond}>
        how can i style you?
      </Text>
      <Text variant="small" color={palette.mutedOnInk} style={styles.openingMeta}>
        {garmentViews.length > 0
          ? `working from your ${garmentViews.length} pieces.`
          : 'your closet is empty — set it up, then i can help.'}
      </Text>
      <View style={styles.chips}>
        {OPENING_CHIPS.map((chip) => (
          <Chip key={chip} label={chip} onPress={() => send(chip)} />
        ))}
      </View>
    </View>
  );

  const sheetGarment = sheetGarmentId ? garmentById(sheetGarmentId) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text variant="title" color={palette.paper}>
          stylist
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`weather ${weather ?? 'not set'}`}
          onPress={() => setWeatherOpen(true)}
          style={styles.weatherPill}
        >
          <View
            style={[
              styles.weatherDot,
              { backgroundColor: weather ? palette.paper : palette.mutedOnInk },
            ]}
          />
          <Text variant="meta" color={palette.paper}>
            {weather ?? 'weather'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={opening}
          ListFooterComponent={
            composingStage ? (
              <View style={styles.composing}>
                <View style={styles.composingDot} />
                <Text variant="micro" color={palette.mutedOnInk}>
                  {composingStage}
                </Text>
              </View>
            ) : messages.length > 0 ? (
              <View style={styles.footerSpace} />
            ) : undefined
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                viewPosition: 0,
                animated: false,
              });
            }, 250);
          }}
          onScroll={(event) => {
            offsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        />

        <ChatComposer
          value={input}
          onChangeText={(value) => {
            setInput(value);
            if (transcript) setTranscript(null);
          }}
          onSend={() => send(input, undefined, voiceUsed)}
          onMic={toggleVoice}
          listening={listening}
          transcript={transcript}
          voiceNote={voiceNote}
          disabled={Boolean(composingStage)}
        />
      </KeyboardAvoidingView>

      <Sheet visible={weatherOpen} onClose={() => setWeatherOpen(false)} title="weather" tone="ink">
        <Text variant="small" color={palette.mutedOnInk} style={styles.weatherNote}>
          live weather is not connected. set it here and the stylist will style for it.
        </Text>
        <View style={styles.weatherOptions}>
          {(['cold', 'mild', 'warm', 'rainy'] as WeatherKey[]).map((option) => (
            <Chip
              key={option}
              label={option}
              active={weather === option}
              onPress={() => {
                setWeather(option);
                setWeatherOpen(false);
                setToast(`weather set to ${option}`);
              }}
            />
          ))}
          <Chip
            label="clear"
            onPress={() => {
              setWeather(null);
              setWeatherOpen(false);
            }}
          />
        </View>
      </Sheet>

      <GarmentDetailModal
        garment={sheetGarment}
        origin="stylist"
        onClose={closeSheet}
        onStyle={(id) => {
          closeSheet();
          setTimeout(() => send('style this', [id]), 220);
        }}
      />

      <Toast message={toast} tone="ink" onDone={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ink },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: hairline,
    borderBottomColor: palette.inkLine,
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: palette.inkLine,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 32,
  },
  weatherDot: { width: 5, height: 5, borderRadius: 3 },
  listContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  opening: { paddingTop: 8, paddingBottom: 24 },
  openingSecond: { marginTop: 2 },
  openingMeta: { marginTop: 14, maxWidth: 300 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: 8 },
  userBubble: {
    backgroundColor: palette.paper,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '84%',
  },
  spoken: { marginTop: 4 },
  stylistBlock: { marginVertical: 8, maxWidth: 620 },
  line: { marginTop: 5 },
  piecesScroll: { marginTop: 12, marginLeft: -2 },
  pieces: { paddingRight: 8, gap: 10 },
  piece: { width: 88 },
  pieceArt: { width: 88, height: 96, alignItems: 'center', justifyContent: 'center' },
  pieceName: { marginTop: 5 },
  composing: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  composingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.mutedOnInk },
  footerSpace: { height: 12 },
  weatherNote: { marginBottom: 14, maxWidth: 320 },
  weatherOptions: { flexDirection: 'row', flexWrap: 'wrap' },
});
