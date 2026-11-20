import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

type Props = {
  /** When false, keep the last frame frozen / unmount preview to free the camera. */
  active?: boolean;
};

/**
 * Full-bleed rear camera under measure UI. Scale math is independent of this layer.
 */
export function CameraBackdrop({ active = true }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const focused = useIsFocused();
  const showPreview = active && focused && permission?.granted === true;

  if (!permission) {
    return <View style={styles.fill} />;
  }

  if (!permission.granted) {
    const canAsk = permission.canAskAgain !== false;
    return (
      <View style={[styles.fill, styles.denied]} accessibilityRole="alert">
        <Text style={styles.deniedTitle}>Camera access needed</Text>
        <Text style={styles.deniedBody}>
          Visual Ruler overlays the ruler on your back camera so you can line up
          real objects. Measurement scale still uses screen density and your
          calibration — the camera is only a viewfinder.
        </Text>
        {canAsk ? (
          <Pressable
            style={styles.btn}
            onPress={() => {
              requestPermission().catch(() => undefined);
            }}
          >
            <Text style={styles.btnText}>Allow camera</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.btn}
            onPress={() => {
              Linking.openSettings().catch(() => undefined);
            }}
          >
            <Text style={styles.btnText}>Open settings</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fill} pointerEvents="none">
      {showPreview ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          mirror={false}
          mode="picture"
          active={showPreview}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.idle]} />
      )}
      {/* Soft top shade so chrome stays readable without hiding the scene. */}
      <View style={styles.topShade} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.graphite,
  },
  idle: {
    backgroundColor: colors.graphite,
  },
  topShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 120,
    backgroundColor: 'rgba(30, 36, 43, 0.35)',
  },
  denied: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  deniedTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  deniedBody: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: colors.graphite,
    fontWeight: '700',
    fontSize: 16,
  },
});
