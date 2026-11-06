import React from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, hairline } from '../theme/tokens';
import { Text } from './Text';
import { CloseIcon } from '../brand/icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  tone?: 'paper' | 'ink';
  maxHeightRatio?: number;
};

/** Menus and confirmations. Sharp edges, quiet border, clear dismissal. */
export function Sheet({ visible, onClose, title, children, tone = 'paper', maxHeightRatio = 0.78 }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const onInk = tone === 'ink';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="close" />
        <View
          style={[
            styles.panel,
            {
              maxHeight: Math.round(height * maxHeightRatio),
              backgroundColor: onInk ? palette.inkRaised : palette.paper,
              borderColor: onInk ? palette.inkLine : palette.paperLine,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.header}>
            <Text variant="title" color={onInk ? palette.paper : palette.ink}>
              {title ?? ''}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="close"
              onPress={onClose}
              hitSlop={14}
              style={styles.close}
            >
              <CloseIcon size={18} color={onInk ? palette.mutedOnInk : palette.mutedInk} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,11,11,0.55)',
  },
  panel: {
    borderTopWidth: hairline,
    borderLeftWidth: hairline,
    borderRightWidth: hairline,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderRadius: radius.sharp,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 620,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  close: { width: 36, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
});
