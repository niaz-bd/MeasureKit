import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { AboutScreen } from './screens/AboutScreen';
import { CalibrationScreen } from './screens/CalibrationScreen';
import { InclinometerScreen } from './screens/InclinometerScreen';
import { LevelScreen } from './screens/LevelScreen';
import { MeasureScreen } from './screens/MeasureScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { colors } from './theme';
import type { RootStackParamList } from './types';

export type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.graphite,
    card: colors.graphiteSoft,
    primary: colors.teal,
    text: colors.text,
    border: colors.graphiteEdge,
  },
};

export function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Measure"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.graphite },
        }}
      >
        <Stack.Screen name="Measure" component={MeasureScreen} />
        <Stack.Screen name="Level" component={LevelScreen} />
        <Stack.Screen name="Inclinometer" component={InclinometerScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Calibration" component={CalibrationScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
