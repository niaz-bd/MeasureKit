import {
  DarkTheme,
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useRef } from 'react';

import {
  MEASURE_TOOL_ROUTES,
  showInterstitialOnToolExit,
} from './ads';
import { AboutScreen } from './screens/AboutScreen';
import { AngleMeterScreen } from './screens/AngleMeterScreen';
import { ArMeasureScreen } from './screens/ArMeasureScreen';
import { CalculatorScreen } from './screens/CalculatorScreen';
import { CalibrationScreen } from './screens/CalibrationScreen';
import { CompassScreen } from './screens/CompassScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InclinometerScreen } from './screens/InclinometerScreen';
import { LandAreaScreen } from './screens/LandAreaScreen';
import { LevelScreen } from './screens/LevelScreen';
import { LightMeterScreen } from './screens/LightMeterScreen';
import { MeasureHistoryScreen } from './screens/MeasureHistoryScreen';
import { MeasureScreen } from './screens/MeasureScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SoundMeterScreen } from './screens/SoundMeterScreen';
import { SpeedometerScreen } from './screens/SpeedometerScreen';
import { UnitConverterScreen } from './screens/UnitConverterScreen';
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
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const routeNameRef = useRef<string | undefined>(undefined);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={() => {
        routeNameRef.current = navigationRef.getCurrentRoute()?.name;
      }}
      onStateChange={() => {
        const previous = routeNameRef.current;
        const current = navigationRef.getCurrentRoute()?.name;
        if (
          previous &&
          current === 'Home' &&
          MEASURE_TOOL_ROUTES.has(previous)
        ) {
          // Leave-tool → home only; never mid-measure.
          showInterstitialOnToolExit();
        }
        routeNameRef.current = current;
      }}
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.graphite },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Measure" component={MeasureScreen} />
        <Stack.Screen name="Calculator" component={CalculatorScreen} />
        <Stack.Screen name="UnitConverter" component={UnitConverterScreen} />
        <Stack.Screen name="MeasureHistory" component={MeasureHistoryScreen} />
        <Stack.Screen name="ArMeasure" component={ArMeasureScreen} />
        <Stack.Screen name="Level" component={LevelScreen} />
        <Stack.Screen name="Inclinometer" component={InclinometerScreen} />
        <Stack.Screen name="Compass" component={CompassScreen} />
        <Stack.Screen name="AngleMeter" component={AngleMeterScreen} />
        <Stack.Screen name="LandArea" component={LandAreaScreen} />
        <Stack.Screen name="Speedometer" component={SpeedometerScreen} />
        <Stack.Screen name="LightMeter" component={LightMeterScreen} />
        <Stack.Screen name="SoundMeter" component={SoundMeterScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Calibration" component={CalibrationScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
