import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  formatLux,
  lightSceneLabel,
  luxFromExif,
  luxToBar,
} from '../sensors/light';
import { useSmoothedLux } from '../sensors/useSmoothedLux';
import { colors, spacing } from '../theme';

const CAMERA_POLL_MS = 700;

export function LightMeterScreen() {
  const navigation = useNavigation();
  const {
    sensorAvailable,
    lux,
    source,
    ingestExternal,
    setSource,
  } = useSmoothedLux();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const busy = useRef(false);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      return () => undefined;
    }, []),
  );

  // Auto-start camera estimate when ambient sensor is missing
  useEffect(() => {
    if (sensorAvailable === false) {
      setCameraActive(true);
      setSource('camera');
    }
  }, [sensorAvailable, setSource]);

  useEffect(() => {
    if (!cameraActive) return;
    if (!permission?.granted) return;

    const id = setInterval(async () => {
      if (busy.current || !cameraRef.current) return;
      busy.current = true;
      try {
        const pic = await cameraRef.current.takePictureAsync({
          quality: 0.05,
          exif: true,
          shutterSound: false,
        });
        const estimated = luxFromExif(
          (pic?.exif as Record<string, unknown> | undefined) ?? null,
        );
        if (estimated != null && Number.isFinite(estimated)) {
          ingestExternal(estimated);
          setCameraNote(null);
        } else {
          setCameraNote(
            'Camera EXIF had no brightness data — try another device or use Android light sensor.',
          );
        }
      } catch {
        setCameraNote('Camera sample failed. Keep the app in the foreground.');
      } finally {
        busy.current = false;
      }
    }, CAMERA_POLL_MS);

    return () => clearInterval(id);
  }, [cameraActive, permission?.granted, ingestExternal]);

  const startCameraFallback = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setCameraNote('Camera permission is required for the estimate fallback.');
        return;
      }
    }
    setSource('camera');
    setCameraActive(true);
  };

  if (sensorAvailable === null) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.body}>Starting light sensor…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to ruler"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Light meter</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <View style={styles.sourceRow}>
        <View
          style={[
            styles.sourceChip,
            source === 'sensor' && styles.sourceChipOn,
          ]}
        >
          <Text style={styles.sourceText}>
            {source === 'sensor'
              ? 'Ambient sensor'
              : source === 'camera'
                ? 'Camera estimate'
                : 'Waiting'}
          </Text>
        </View>
        {sensorAvailable === false ? (
          <Text style={styles.sourceHint}>No light sensor — using camera</Text>
        ) : null}
      </View>

      <View style={styles.stage}>
        <Text style={styles.heroLux}>{formatLux(lux)}</Text>
        <Text style={styles.heroUnit}>lux</Text>
        <Text style={styles.scene}>{lightSceneLabel(lux)}</Text>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.round(luxToBar(lux) * 100)}%` },
            ]}
          />
        </View>
        <View style={styles.barLabels}>
          <Text style={styles.barLabel}>1</Text>
          <Text style={styles.barLabel}>100</Text>
          <Text style={styles.barLabel}>10k</Text>
          <Text style={styles.barLabel}>100k</Text>
        </View>
      </View>

      {cameraActive && permission?.granted ? (
        <View style={styles.cameraWrap}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            mode="picture"
            animateShutter={false}
          />
          <Text style={styles.cameraCaption}>
            Point the camera at the scene for an approximate reading
          </Text>
        </View>
      ) : null}

      {sensorAvailable && !cameraActive ? (
        <Pressable style={styles.secondaryBtn} onPress={startCameraFallback}>
          <Text style={styles.secondaryBtnText}>Use camera estimate</Text>
        </Pressable>
      ) : null}

      {sensorAvailable === false && !permission?.granted ? (
        <Pressable style={styles.btn} onPress={startCameraFallback}>
          <Text style={styles.btnText}>Allow camera</Text>
        </Pressable>
      ) : null}

      {cameraNote ? <Text style={styles.note}>{cameraNote}</Text> : null}

      <Text style={styles.hint}>
        Live smoothed lux. Ambient light sensor on Android is preferred; camera
        EXIF estimates are approximate.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.graphiteSoft,
  },
  iconBtnPlaceholder: { width: 44, height: 44 },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  sourceRow: {
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  sourceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.graphiteSoft,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
  },
  sourceChipOn: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  sourceText: {
    color: colors.teal,
    fontWeight: '600',
    fontSize: 13,
  },
  sourceHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  stage: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  heroLux: {
    color: colors.white,
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroUnit: {
    color: colors.teal,
    fontSize: 20,
    fontWeight: '600',
    marginTop: -4,
  },
  scene: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  barTrack: {
    width: '100%',
    height: 14,
    borderRadius: 8,
    backgroundColor: colors.graphiteSoft,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.teal,
    borderRadius: 8,
  },
  barLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  cameraWrap: {
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    marginBottom: spacing.md,
  },
  camera: {
    flex: 1,
  },
  cameraCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    backgroundColor: 'rgba(30,36,43,0.72)',
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
  },
  btn: {
    alignSelf: 'center',
    backgroundColor: colors.teal,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  btnText: {
    color: colors.graphite,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    marginBottom: spacing.sm,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: '600',
  },
  note: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  hint: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
