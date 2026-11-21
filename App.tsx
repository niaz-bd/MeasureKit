import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AdsProvider } from './src/AdsContext';
import { initializeAds } from './src/ads';
import { ImmersiveSystemUI } from './src/ImmersiveSystemUI';
import { AppNavigator } from './src/navigation';
import { colors } from './src/theme';

function Root() {
  useEffect(() => {
    // Safe no-op in Expo Go / when RNGoogleMobileAdsModule is missing.
    initializeAds().catch(() => undefined);
  }, []);

  return (
    <>
      <ImmersiveSystemUI />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AdsProvider>
          <Root />
        </AdsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
});
