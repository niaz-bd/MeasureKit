import { NavigationBar, useVisibility } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { colors } from './theme';

/**
 * App-wide immersive / edge-to-edge chrome: hide Android status + navigation bars.
 * Re-hides the nav bar after a swipe reveal (sticky immersive).
 */
export function ImmersiveSystemUI() {
  const navVisibility = useVisibility();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.graphite).catch(() => undefined);

    if (Platform.OS === 'android') {
      NavigationBar.setHidden(true);
      StatusBar.setHidden(true, 'none');
    } else {
      StatusBar.setHidden(true, 'fade');
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (navVisibility !== 'visible') return;
    const t = setTimeout(() => {
      NavigationBar.setHidden(true);
      StatusBar.setHidden(true, 'none');
    }, 2500);
    return () => clearTimeout(t);
  }, [navVisibility]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Platform.OS !== 'android') return;
      NavigationBar.setHidden(true);
      StatusBar.setHidden(true, 'none');
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar hidden style="light" />
      {Platform.OS === 'android' ? (
        <NavigationBar hidden style="dark" />
      ) : null}
    </>
  );
}
