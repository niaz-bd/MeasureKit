import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useAds } from '../AdsContext';
import { adsAvailable, isExpoGo } from '../ads';
import { colors, spacing } from '../theme';

/**
 * Optional rewarded “Remove ads 24h” entry point for Home / Settings.
 */
export function RemoveAdsButton() {
  const { adsFreeActive, adsFreeLabel, requestRemoveAds } = useAds();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const onPress = async () => {
    if (adsFreeActive || busy) return;
    setBusy(true);
    setNote(null);
    const result = await requestRemoveAds();
    setBusy(false);
    if (result === 'unavailable') {
      setNote(
        isExpoGo()
          ? 'Rewarded ads need a native build (expo run:android)'
          : 'Ads unavailable on this device',
      );
    } else if (result === 'dismissed') {
      setNote('Ad closed before reward');
    } else if (result === 'failed') {
      setNote('Could not load rewarded ad');
    }
  };

  if (adsFreeActive) {
    return (
      <Pressable style={[styles.btn, styles.btnIdle]} disabled>
        <Text style={styles.labelOn}>{adsFreeLabel ?? 'Ads removed'}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.btn}
      onPress={onPress}
      disabled={busy}
      accessibilityLabel="Watch ad to remove ads for 24 hours"
    >
      {busy ? (
        <ActivityIndicator color={colors.teal} />
      ) : (
        <Text style={styles.label}>Remove ads 24h</Text>
      )}
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {!adsAvailable() && !note ? (
        <Text style={styles.note}>
          {isExpoGo() ? 'Native build required for ads' : 'Ads unavailable'}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.teal,
    minHeight: 44,
  },
  btnIdle: {
    backgroundColor: colors.graphiteSoft,
    borderColor: colors.graphiteEdge,
  },
  label: {
    color: colors.teal,
    fontWeight: '700',
    fontSize: 14,
  },
  labelOn: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  note: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
});
