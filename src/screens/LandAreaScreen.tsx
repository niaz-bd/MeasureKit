import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  type MapPressEvent,
  type Region,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GPS_MIN_STEP_M,
  formatArea,
  formatLength,
  haversineM,
  perimeterM,
  polygonAreaM2,
  type LatLng,
} from '../geo/areaMath';
import { useLogMeasurementOnLeave } from '../history/useLogMeasurementOnLeave';
import { colors, spacing } from '../theme';

type Mode = 'manual' | 'gps';
type MapKind = 'hybrid' | 'standard' | 'satellite';

const DEFAULT_REGION: Region = {
  latitude: 23.8103,
  longitude: 90.4125,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export function LandAreaScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [mode, setMode] = useState<Mode>('manual');
  const [mapKind, setMapKind] = useState<MapKind>('hybrid');
  const [points, setPoints] = useState<LatLng[]>([]);
  const [permission, setPermission] = useState<
    'unknown' | 'granted' | 'denied'
  >('unknown');
  const [locating, setLocating] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [userCoord, setUserCoord] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      return () => {
        watchRef.current?.remove();
        watchRef.current = null;
      };
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setPermission('denied');
          setLocating(false);
          setError('Location permission is required for the map and GPS track.');
          return;
        }
        setPermission('granted');
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const next: Region = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        };
        setUserCoord({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setRegion(next);
        mapRef.current?.animateToRegion(next, 600);
      } catch {
        if (!cancelled) {
          setError('Could not read current location.');
        }
      } finally {
        if (!cancelled) setLocating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tracking) {
      watchRef.current?.remove();
      watchRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: GPS_MIN_STEP_M,
          timeInterval: 1000,
        },
        (pos) => {
          if (cancelled) return;
          const next: LatLng = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserCoord(next);
          setPoints((prev) => {
            const last = prev[prev.length - 1];
            if (last && haversineM(last, next) < GPS_MIN_STEP_M) return prev;
            return [...prev, next];
          });
        },
      );
    })();
    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [tracking]);

  const areaM2 = useMemo(() => polygonAreaM2(points), [points]);
  const periM = useMemo(() => perimeterM(points), [points]);
  const areaFmt = formatArea(areaM2);
  const periFmt = formatLength(periM);

  useLogMeasurementOnLeave('landArea', 'Land area', () => {
    if (points.length < 3 || !(areaM2 > 0)) return null;
    return {
      summary: `${areaFmt.value} ${areaFmt.unit}`,
      values: {
        areaM2: Number(areaM2.toFixed(2)),
        perimeterM: Number(periM.toFixed(2)),
        points: points.length,
        mode,
      },
    };
  });

  const onMapPress = (e: MapPressEvent) => {
    if (mode !== 'manual' || tracking) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPoints((prev) => [...prev, { latitude, longitude }]);
  };

  const onMarkerDrag = (index: number, coord: LatLng) => {
    setPoints((prev) => {
      const next = [...prev];
      next[index] = coord;
      return next;
    });
  };

  const undo = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  const clearAll = () => {
    setTracking(false);
    setPoints([]);
  };

  const deleteSelectedHint = () => {
    // Remove last vertex (same as undo) — explicit control
    undo();
  };

  const goToUser = async () => {
    if (permission !== 'granted') return;
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      };
      setUserCoord({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      mapRef.current?.animateToRegion(next, 500);
    } catch {
      setError('Could not refresh location.');
    }
  };

  const cycleMapKind = () => {
    setMapKind((k) =>
      k === 'hybrid' ? 'satellite' : k === 'satellite' ? 'standard' : 'hybrid',
    );
  };

  const switchMode = (m: Mode) => {
    setTracking(false);
    setMode(m);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to ruler"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Land area</Text>
        <Pressable
          style={styles.iconBtn}
          onPress={cycleMapKind}
          accessibilityLabel="Change map type"
        >
          <MaterialCommunityIcons name="layers-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, mode === 'manual' && styles.modeChipOn]}
          onPress={() => switchMode('manual')}
        >
          <MaterialCommunityIcons
            name="vector-polyline"
            size={18}
            color={mode === 'manual' ? colors.teal : colors.textMuted}
          />
          <Text style={[styles.modeText, mode === 'manual' && styles.modeTextOn]}>
            Manual
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, mode === 'gps' && styles.modeChipOn]}
          onPress={() => switchMode('gps')}
        >
          <MaterialCommunityIcons
            name="walk"
            size={18}
            color={mode === 'gps' ? colors.teal : colors.textMuted}
          />
          <Text style={[styles.modeText, mode === 'gps' && styles.modeTextOn]}>
            GPS walk
          </Text>
        </Pressable>
      </View>

      <View style={styles.mapWrap}>
        {locating ? (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator color={colors.teal} />
            <Text style={styles.mapPlaceholderText}>Finding location…</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            mapType={mapKind}
            initialRegion={region}
            onPress={onMapPress}
            showsUserLocation={permission === 'granted'}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            rotateEnabled
            pitchEnabled={false}
          >
            {points.length >= 2 ? (
              <Polyline
                coordinates={points}
                strokeColor={colors.teal}
                strokeWidth={3}
              />
            ) : null}
            {points.length >= 3 ? (
              <Polygon
                coordinates={points}
                strokeColor={colors.teal}
                fillColor="rgba(46, 196, 182, 0.28)"
                strokeWidth={2}
              />
            ) : null}
            {points.map((p, i) => (
              <Marker
                key={`v-${i}`}
                coordinate={p}
                draggable={mode === 'manual' && !tracking}
                onDragEnd={(e) =>
                  onMarkerDrag(i, e.nativeEvent.coordinate)
                }
                pinColor={i === 0 ? '#E8A838' : colors.teal}
                title={`Point ${i + 1}`}
              />
            ))}
          </MapView>
        )}

        <Pressable style={styles.fabLocate} onPress={goToUser}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={[styles.stats, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Area</Text>
          <Text style={styles.statValue}>
            {areaFmt.value}{' '}
            <Text style={styles.statUnit}>{areaFmt.unit}</Text>
          </Text>
          {areaM2 >= 10_000 ? (
            <Text style={styles.statSub}>{areaM2.toFixed(0)} m²</Text>
          ) : areaM2 >= 100 ? (
            <Text style={styles.statSub}>
              {(areaM2 / 10_000).toFixed(4)} ha
            </Text>
          ) : null}
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Perimeter</Text>
          <Text style={styles.statValue}>
            {periFmt.value}{' '}
            <Text style={styles.statUnit}>{periFmt.unit}</Text>
          </Text>
          <Text style={styles.statSub}>{points.length} points</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        {mode === 'gps' ? (
          <Pressable
            style={[styles.toolBtn, tracking && styles.toolBtnDanger]}
            onPress={() => setTracking((t) => !t)}
            disabled={permission !== 'granted'}
          >
            <MaterialCommunityIcons
              name={tracking ? 'stop' : 'play'}
              size={20}
              color={colors.white}
            />
            <Text style={styles.toolBtnText}>
              {tracking ? 'Stop' : 'Start walk'}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.manualHint}>Tap map to add · drag pins to edit</Text>
        )}

        <View style={styles.toolRow}>
          <Pressable
            style={styles.iconTool}
            onPress={undo}
            disabled={points.length === 0 || tracking}
            accessibilityLabel="Undo last point"
          >
            <MaterialCommunityIcons
              name="undo"
              size={22}
              color={points.length && !tracking ? colors.text : colors.graphiteEdge}
            />
          </Pressable>
          <Pressable
            style={styles.iconTool}
            onPress={deleteSelectedHint}
            disabled={points.length === 0 || tracking}
            accessibilityLabel="Delete last point"
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={22}
              color={points.length && !tracking ? colors.text : colors.graphiteEdge}
            />
          </Pressable>
          <Pressable
            style={styles.iconTool}
            onPress={clearAll}
            disabled={points.length === 0 && !tracking}
            accessibilityLabel="Clear all points"
          >
            <MaterialCommunityIcons
              name="notification-clear-all"
              size={22}
              color={
                points.length || tracking ? colors.danger : colors.graphiteEdge
              }
            />
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {permission === 'denied' ? (
        <Text style={styles.error}>
          Enable location permission in system settings to use this tool.
        </Text>
      ) : null}
      {userCoord == null && permission === 'granted' && !locating ? (
        <Text style={styles.hint}>Map ready — add points to measure land.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.graphite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.graphiteSoft,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.graphiteSoft,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
  },
  modeChipOn: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  modeText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  modeTextOn: {
    color: colors.teal,
  },
  mapWrap: {
    flex: 1,
    marginHorizontal: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    backgroundColor: colors.graphiteSoft,
  },
  map: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  mapPlaceholderText: {
    color: colors.textMuted,
  },
  fabLocate: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.graphite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.graphiteSoft,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.graphiteEdge,
    marginVertical: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  statUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.teal,
  },
  statSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.teal,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  toolBtnDanger: {
    backgroundColor: colors.danger,
  },
  toolBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  manualHint: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 4,
  },
  iconTool: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.graphiteSoft,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 13,
  },
  hint: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 12,
  },
});
