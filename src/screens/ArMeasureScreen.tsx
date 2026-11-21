import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ArMeasurePanel } from '../ar/ArMeasurePanel';
import { useToolPrefs } from '../hooks/useToolPrefs';
import { colors } from '../theme';
import type { RootStackParamList } from '../types';
import type { UnitSystem } from '../units';

export function ArMeasureScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { prefs, updatePrefs } = useToolPrefs('ar');

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

  const onChangeUnit = (unit: UnitSystem) => {
    updatePrefs({ unit }).catch(() => undefined);
  };

  return (
    <View style={styles.root}>
      <ArMeasurePanel
        unit={prefs.unit}
        onChangeUnit={onChangeUnit}
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
