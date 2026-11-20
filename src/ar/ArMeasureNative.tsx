/**
 * Native-only AR measure UI (Viro + ARCore).
 * Load only after hasViroNative() is true.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ViroAmbientLight,
  ViroARScene,
  ViroARSceneNavigator,
  ViroMaterials,
  ViroNode,
  ViroPolyline,
  ViroSphere,
  ViroText,
  ViroTrackingStateConstants,
} from '@reactvision/react-viro';

import { GlowReadout } from '../components/GlowReadout';
import { colors, spacing } from '../theme';
import { formatMeasurement, unitLabel, type UnitSystem } from '../units';

type Vec3 = [number, number, number];
type HitResult = {
  type: string;
  transform: { position: Vec3 };
};

export type ArMeasureNativeProps = {
  unit: UnitSystem;
  onOpenSettings: () => void;
};

type TapRequest = { x: number; y: number; id: number };
type ClearRequest = { id: number };

type AppProps = {
  unit: UnitSystem;
  tapRequest: TapRequest | null;
  clearRequest: ClearRequest | null;
  onDistanceMm: (mm: number | null) => void;
  onHint: (text: string) => void;
  onTracking: (ok: boolean) => void;
};

ViroMaterials.createMaterials({
  arMarker: { lightingModel: 'Constant', diffuseColor: '#2EC4B6' },
  arLine: { lightingModel: 'Constant', diffuseColor: '#E8EEF2' },
});

function pickHit(results: HitResult[] | null | undefined): Vec3 | null {
  if (!results?.length) return null;
  const preferred =
    results.find((r) => r.type === 'ExistingPlaneUsingExtent') ||
    results.find((r) => r.type === 'ExistingPlane') ||
    results.find((r) => r.type === 'EstimatedHorizontalPlane') ||
    results.find((r) => r.type === 'DepthPoint') ||
    results[0];
  const p = preferred?.transform?.position;
  if (!p || p.length < 3) return null;
  return [p[0], p[1], p[2]];
}

function distanceMeters(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const markerText = {
  fontFamily: 'Arial',
  fontSize: 24,
  color: '#FFFFFF',
  textAlign: 'center' as const,
};

function ArMeasureScene(props: {
  arSceneNavigator?: { viroAppProps?: AppProps };
}) {
  const app = props.arSceneNavigator?.viroAppProps;
  const sceneRef = useRef<{
    performARHitTestWithPoint?: (
      x: number,
      y: number,
    ) => Promise<HitResult[]>;
  } | null>(null);
  const [points, setPoints] = useState<Vec3[]>([]);
  const lastTapId = useRef(0);
  const lastClearId = useRef(0);

  const publish = useCallback(
    (next: Vec3[]) => {
      setPoints(next);
      if (next.length === 2) {
        app?.onDistanceMm(distanceMeters(next[0], next[1]) * 1000);
        app?.onHint('Measured — Clear to start over');
      } else if (next.length === 1) {
        app?.onDistanceMm(null);
        app?.onHint('Tap to place the second point');
      } else {
        app?.onDistanceMm(null);
        app?.onHint('Tap to place the first point on a plane');
      }
    },
    [app],
  );

  useEffect(() => {
    const req = app?.clearRequest;
    if (!req || req.id === lastClearId.current) return;
    lastClearId.current = req.id;
    publish([]);
  }, [app?.clearRequest, publish]);

  useEffect(() => {
    const req = app?.tapRequest;
    if (!req || req.id === lastTapId.current) return;
    lastTapId.current = req.id;
    const run = async () => {
      const hit = sceneRef.current?.performARHitTestWithPoint;
      if (!hit) {
        app?.onHint('AR scene not ready yet');
        return;
      }
      try {
        const results = await hit(req.x, req.y);
        const pos = pickHit(results);
        if (!pos) {
          app?.onHint('No plane there — aim at a flat surface and try again');
          return;
        }
        setPoints((prev) => {
          const next =
            prev.length >= 2 ? [prev[0], pos] : prev.length === 1 ? [prev[0], pos] : [pos];
          if (next.length === 2) {
            app?.onDistanceMm(distanceMeters(next[0], next[1]) * 1000);
            app?.onHint('Measured — Clear to start over');
          } else {
            app?.onDistanceMm(null);
            app?.onHint('Tap to place the second point');
          }
          return next;
        });
      } catch {
        app?.onHint('Hit test failed — keep the surface in view');
      }
    };
    run().catch(() => undefined);
  }, [app, app?.tapRequest]);

  return (
    <ViroARScene
      ref={(r) => {
        sceneRef.current = r as typeof sceneRef.current;
      }}
      onTrackingUpdated={(state: number) => {
        const ok = state === ViroTrackingStateConstants.TRACKING_NORMAL;
        app?.onTracking(ok);
        if (!ok) app?.onHint('Move the phone slowly to find a surface…');
        else if (points.length === 0) {
          app?.onHint('Tap to place the first point on a plane');
        }
      }}
    >
      <ViroAmbientLight color="#ffffff" intensity={1000} />
      {points.map((p, i) => (
        <ViroNode key={`p-${i}`} position={p}>
          <ViroSphere radius={0.012} materials={['arMarker']} />
          <ViroText
            text={`${i + 1}`}
            scale={[0.08, 0.08, 0.08]}
            position={[0, 0.04, 0]}
            style={markerText}
            transformBehaviors={['billboard']}
          />
        </ViroNode>
      ))}
      {points.length === 2 ? (
        <ViroPolyline points={points} thickness={0.006} materials={['arLine']} />
      ) : null}
    </ViroARScene>
  );
}

export function ArMeasureNative({ unit, onOpenSettings }: ArMeasureNativeProps) {
  const [distanceMm, setDistanceMm] = useState<number | null>(null);
  const [hint, setHint] = useState('Initializing AR…');
  const [trackingOk, setTrackingOk] = useState(false);
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [tapRequest, setTapRequest] = useState<TapRequest | null>(null);
  const [clearRequest, setClearRequest] = useState<ClearRequest | null>(null);
  const tapSeq = useRef(0);
  const clearSeq = useRef(0);

  const appProps = useMemo<AppProps>(
    () => ({
      unit,
      tapRequest,
      clearRequest,
      onDistanceMm: setDistanceMm,
      onHint: setHint,
      onTracking: setTrackingOk,
    }),
    [unit, tapRequest, clearRequest],
  );

  const requestTap = (x: number, y: number) => {
    tapSeq.current += 1;
    setTapRequest({ x, y, id: tapSeq.current });
  };

  const readout =
    distanceMm != null ? formatMeasurement(distanceMm, unit) : '—';

  return (
    <View
      style={styles.root}
      onLayout={(e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ w: width, h: height });
      }}
    >
      <ViroARSceneNavigator
        autofocus
        style={styles.ar}
        initialScene={{ scene: ArMeasureScene as never }}
        viroAppProps={appProps}
      />

      <Pressable
        style={styles.tapLayer}
        onPress={(e) =>
          requestTap(e.nativeEvent.locationX, e.nativeEvent.locationY)
        }
      />

      <View style={styles.crosshair} pointerEvents="none">
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
      </View>

      <View style={styles.chrome} pointerEvents="box-none">
        <Pressable
          style={styles.iconBtn}
          onPress={onOpenSettings}
          accessibilityLabel="Open settings"
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={26}
            color={colors.text}
          />
        </Pressable>
        <GlowReadout value={readout} unit={unitLabel(unit)} />
        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              if (layout.w > 0 && layout.h > 0) {
                requestTap(layout.w / 2, layout.h / 2);
              }
            }}
          >
            <Text style={styles.actionText}>Place</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              clearSeq.current += 1;
              setClearRequest({ id: clearSeq.current });
              setDistanceMm(null);
            }}
          >
            <Text style={styles.actionText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.hintBar} pointerEvents="none">
        <Text style={styles.hintText}>{hint}</Text>
        {!trackingOk ? (
          <Text style={styles.hintSub}>Waiting for AR tracking…</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ar: { flex: 1 },
  tapLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 2,
  },
  crosshair: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 28,
    height: 28,
    marginLeft: -14,
    marginTop: -14,
    zIndex: 3,
  },
  crosshairH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 13,
    height: 2,
    backgroundColor: colors.teal,
    opacity: 0.85,
  },
  crosshairV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 13,
    width: 2,
    backgroundColor: colors.teal,
    opacity: 0.85,
  },
  chrome: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 4,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 48, 56, 0.72)',
  },
  actions: { gap: spacing.sm, alignItems: 'flex-end' },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(42, 48, 56, 0.8)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.teal,
  },
  actionText: { color: colors.teal, fontWeight: '700' },
  hintBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 36, 43, 0.72)',
    zIndex: 4,
  },
  hintText: { color: colors.text, fontSize: 15, textAlign: 'center' },
  hintSub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
