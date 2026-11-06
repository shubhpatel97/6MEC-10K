import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CrestApp } from './src/screens/CrestApp';
import { WardrobeProvider } from './src/state/WardrobeProvider';
import { applyWebChrome } from './src/lib/webChrome';

applyWebChrome();

export default function App() {
  return (
    <SafeAreaProvider>
      <WardrobeProvider>
        <StatusBar style="light" />
        <CrestApp />
      </WardrobeProvider>
    </SafeAreaProvider>
  );
}
