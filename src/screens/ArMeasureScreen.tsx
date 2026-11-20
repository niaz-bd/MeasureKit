import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ArMeasurePanel } from '../ar/ArMeasurePanel';
import { useSettings } from '../SettingsContext';
import { colors } from '../theme';
import type { RootStackParamList } from '../types';

export function ArMeasureScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { unit } = useSettings();

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      ).catch(() => undefined);
      return () => {
        ScreenOrientation.unlockAsync().catch(() => undefined);
      };
    }, []),
  );

  return (
    <View style={styles.root}>
      <ArMeasurePanel
        unit={unit}
        onOpenSettings={() => navigation.navigate('Settings')}
        onBackToContact={() => navigation.navigate('Home')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.graphite,
  },
});
