import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, layout, hairline } from '../theme/tokens';
import { Text } from './Text';
import { HangerIcon, StylistIcon, YouIcon } from '../brand/icons';

export type TabKey = 'closet' | 'stylist' | 'you';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'closet', label: 'closet' },
  { key: 'stylist', label: 'stylist' },
  { key: 'you', label: 'you' },
];

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  tone: 'paper' | 'ink';
  maxWidth?: number;
};

export function TabBar({ active, onChange, tone, maxWidth = layout.closetWidth }: Props) {
  const insets = useSafeAreaInsets();
  const onPaper = tone === 'paper';
  const foreground = onPaper ? palette.ink : palette.paper;
  const background = onPaper ? palette.paper : palette.ink;
  const border = onPaper ? palette.paperLine : palette.inkLine;

  return (
    <View style={[styles.bar, { backgroundColor: background, borderTopColor: border }]}>
      <View style={[styles.inner, { maxWidth, paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map((tab) => {
          const selected = active === tab.key;
          const color = selected ? foreground : palette.mutedOnInk;
          const Icon = tab.key === 'closet' ? HangerIcon : tab.key === 'stylist' ? StylistIcon : YouIcon;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(tab.key)}
              style={styles.tab}
            >
              {selected ? <View style={[styles.indicator, { backgroundColor: foreground }]} /> : null}
              <Icon size={21} color={color} />
              <Text variant="micro" color={color} style={styles.label}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: hairline, width: '100%' },
  inner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: layout.tabBarHeight - 8 },
  label: { letterSpacing: 0.1 },
  indicator: { position: 'absolute', top: -9, width: 18, height: 1.5 },
});
