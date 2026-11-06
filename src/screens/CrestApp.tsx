import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../theme/tokens';
import { useWardrobe } from '../state/WardrobeProvider';
import { TabBar, TabKey } from '../ui/TabBar';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { CrestMark } from '../brand/CrestMark';
import { OnboardingScreen } from './onboarding/OnboardingScreen';
import { ClosetScreen } from './ClosetScreen';
import { StylistScreen } from './StylistScreen';
import { YouScreen } from './YouScreen';

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/** Exactly three primary tabs, closet first. */
export function CrestApp() {
  const { hydrated, storageError, onboardingComplete, retryLoad, resetAll } = useWardrobe();
  const [tab, setTab] = useState<TabKey>('closet');
  const [pendingAnchorId, setPendingAnchorId] = useState<string | null>(null);
  const keyboardVisible = useKeyboardVisible();
  const previousOnboarding = useRef(onboardingComplete);

  useEffect(() => {
    if (!onboardingComplete) {
      setTab('closet');
      setPendingAnchorId(null);
    }
    if (onboardingComplete && !previousOnboarding.current) {
      setTab('closet');
    }
    previousOnboarding.current = onboardingComplete;
  }, [onboardingComplete]);

  if (!hydrated) {
    return (
      <View style={styles.boot}>
        <StatusBar style="light" />
        <CrestMark height={24} color={palette.paper} />
        <Text variant="micro" color={palette.mutedOnInk} style={styles.bootLabel}>
          opening your closet
        </Text>
      </View>
    );
  }

  if (storageError && !onboardingComplete) {
    return (
      <SafeAreaView style={styles.errorScreen}>
        <StatusBar style="light" />
        <Text variant="display" color={palette.paper}>
          we couldn’t open your closet.
        </Text>
        <Text variant="body" color={palette.mutedOnInk} style={styles.errorBody}>
          {storageError} your data has not been changed.
        </Text>
        <Button label="try again" variant="solidPaper" onPress={retryLoad} style={styles.errorButton} />
        <Button
          label="start fresh"
          variant="quietPaper"
          onPress={() => {
            void resetAll();
          }}
          style={styles.errorSecondary}
        />
      </SafeAreaView>
    );
  }

  if (!onboardingComplete) {
    return <OnboardingScreen />;
  }

  const onPaper = tab === 'closet';
  return (
    <View style={styles.root}>
      <StatusBar style={onPaper ? 'dark' : 'light'} />
      <View style={[styles.column, { backgroundColor: onPaper ? palette.paper : palette.ink }]}>
        {tab === 'closet' ? (
          <ClosetScreen
            onAskStylist={() => setTab('stylist')}
            onStyleGarment={(id) => {
              setPendingAnchorId(id);
              setTab('stylist');
            }}
          />
        ) : null}
        {tab === 'stylist' ? (
          <StylistScreen pendingAnchorId={pendingAnchorId} onConsumeAnchor={() => setPendingAnchorId(null)} />
        ) : null}
        {tab === 'you' ? <YouScreen onOpenStylist={() => setTab('stylist')} /> : null}
        {!keyboardVisible || Platform.OS === 'web' ? (
          <TabBar active={tab} onChange={setTab} tone={onPaper ? 'paper' : 'ink'} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 760 },
  boot: { flex: 1, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  bootLabel: { marginTop: 14 },
  errorScreen: { flex: 1, backgroundColor: palette.ink, paddingHorizontal: 24, justifyContent: 'center' },
  errorBody: { marginTop: 12, maxWidth: 360 },
  errorButton: { marginTop: 26, alignSelf: 'flex-start', minWidth: 160 },
  errorSecondary: { marginTop: 8, alignSelf: 'flex-start' },
});
