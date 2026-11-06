import React from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { palette, radius } from '../theme/tokens';
import { Text } from './Text';
import { MicIcon, SendIcon } from '../brand/icons';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onMic: () => void;
  listening: boolean;
  transcript: string | null;
  voiceNote: string | null;
  disabled?: boolean;
};

/**
 * The composer carries a real text input with a visible caret on every platform.
 * Voice recognition fills this same field, so speech and typing share one path.
 */
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onMic,
  listening,
  transcript,
  voiceNote,
  disabled = false,
}: Props) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.wrap}>
      {listening ? (
        <View style={styles.listening}>
          <View style={styles.dot} />
          <Text variant="micro" color={palette.paper}>
            listening — speak now
          </Text>
        </View>
      ) : null}
      {transcript ? (
        <Text variant="micro" color={palette.mutedOnInk} style={styles.transcript} numberOfLines={2}>
          heard · {transcript}
        </Text>
      ) : null}
      {voiceNote ? (
        <Text variant="micro" color={palette.mutedOnInk} style={styles.transcript} numberOfLines={2}>
          {voiceNote}
        </Text>
      ) : null}

      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="ask for a look"
          placeholderTextColor={palette.mutedOnInk}
          style={styles.input}
          multiline
          maxLength={600}
          selectionColor={palette.paper}
          cursorColor={palette.paper}
          textAlignVertical="center"
          accessibilityLabel="message your stylist"
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
          blurOnSubmit={false}
          returnKeyType="send"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? 'stop listening' : 'speak to your stylist'}
          onPress={onMic}
          style={({ pressed }) => [
            styles.round,
            listening && { backgroundColor: palette.paper },
            pressed && { opacity: 0.7 },
          ]}
        >
          <MicIcon size={19} color={listening ? palette.ink : palette.paper} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="send"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
          style={({ pressed }) => [
            styles.round,
            styles.send,
            !canSend && { opacity: 0.35 },
            pressed && canSend && { opacity: 0.7 },
          ]}
        >
          <SendIcon size={18} color={palette.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: palette.ink,
    borderTopWidth: 1,
    borderTopColor: palette.inkLine,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 112,
    borderRadius: radius.chatInput,
    backgroundColor: palette.inkRaised,
    borderWidth: 1,
    borderColor: palette.inkLine,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 13,
    color: palette.paper,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Platform.select({
      ios: 'Helvetica Neue',
      android: 'sans-serif',
      web: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      default: 'System',
    }),
  },
  round: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.inkLine,
    backgroundColor: palette.inkRaised,
  },
  send: { backgroundColor: palette.paper, borderColor: palette.paper },
  listening: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.paper },
  transcript: { paddingBottom: 6 },
});
