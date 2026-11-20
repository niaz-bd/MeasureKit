import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../types';
import { useSettings } from '../SettingsContext';
import { colors, spacing } from '../theme';
import { CREDIT_CARD_LENGTH_MM, DEFAULT_MM_PER_DP } from '../units';

const HANDLE = 36;

export function CalibrationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { applyCalibration } = useSettings();
  const [width, setWidth] = useState(0);
  const [cardDp, setCardDp] = useState(0);
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const maxW = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    maxW.value = w;
    const initial = Math.min(w * 0.7, CREDIT_CARD_LENGTH_MM / DEFAULT_MM_PER_DP);
    x.value = initial;
    setCardDp(initial);
  };

  const sync = useCallback((v: number) => setCardDp(v), []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          start.value = x.value;
        })
        .onUpdate((e) => {
          const next = Math.min(Math.max(40, start.value + e.translationX), maxW.value);
          x.value = next;
          runOnJS(sync)(next);
        }),
    [maxW, start, sync, x],
  );

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - HANDLE / 2 }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: x.value,
  }));

  const onSave = async () => {
    if (cardDp <= 0) return;
    const mmPerDp = CREDIT_CARD_LENGTH_MM / cardDp;
    await applyCalibration(mmPerDp);
    navigation.navigate('Measure');
  };

  const onCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>Calibrate</Text>
      <Text style={styles.copy}>
        Place a credit card along the teal bar. Drag the handle until the bar
        matches the card’s long edge ({CREDIT_CARD_LENGTH_MM} mm).
      </Text>

      <View style={styles.stage} onLayout={onLayout}>
        <View style={styles.originMark} />
        <Animated.View style={[styles.cardBar, barStyle]} />
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.handle, handleStyle]}>
            <View style={styles.handleInner} />
          </Animated.View>
        </GestureDetector>
        <Text style={styles.hint}>
          Guide width: {cardDp.toFixed(1)} dp · estimated{' '}
          {(cardDp * DEFAULT_MM_PER_DP).toFixed(1)} mm before save
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondary} onPress={onCancel}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, width <= 0 && styles.disabled]}
          onPress={onSave}
          disabled={width <= 0}
        >
          <Text style={styles.primaryText}>Save calibration</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  stage: {
    height: 140,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  originMark: {
    position: 'absolute',
    left: 0,
    top: 28,
    bottom: 40,
    width: 2,
    backgroundColor: colors.tickMajor,
  },
  cardBar: {
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.tealSoft,
    borderWidth: 1.5,
    borderColor: colors.teal,
    marginLeft: 0,
  },
  handle: {
    position: 'absolute',
    top: 28,
    width: HANDLE,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleInner: {
    width: 14,
    height: 40,
    borderRadius: 7,
    backgroundColor: colors.teal,
    borderWidth: 2,
    borderColor: colors.white,
  },
  hint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    color: colors.textMuted,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primary: {
    flex: 1,
    backgroundColor: colors.teal,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.graphite,
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
});
