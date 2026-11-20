import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CONVERT_CATEGORIES,
  convertValue,
  formatConverted,
  getCategory,
  type ConvertCategory,
} from '../convert/units';
import { colors, spacing } from '../theme';

export function UnitConverterScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<ConvertCategory>('length');
  const [fromId, setFromId] = useState('m');
  const [toId, setToId] = useState('ft');
  const [input, setInput] = useState('1');

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      return () => undefined;
    }, []),
  );

  const cat = getCategory(category);

  const onPickCategory = (id: ConvertCategory) => {
    const next = getCategory(id);
    setCategory(id);
    setFromId(next.units[0].id);
    setToId(next.units[Math.min(1, next.units.length - 1)].id);
  };

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  const numeric = useMemo(() => {
    const cleaned = input.replace(',', '.').trim();
    if (
      cleaned === '' ||
      cleaned === '-' ||
      cleaned === '.' ||
      cleaned === '-.'
    ) {
      return null;
    }
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }, [input]);

  const output =
    numeric == null
      ? '—'
      : formatConverted(convertValue(category, numeric, fromId, toId));

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to menu"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Unit converter</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={category}
            onValueChange={(v) => onPickCategory(v as ConvertCategory)}
            style={styles.picker}
            dropdownIconColor={colors.teal}
            mode="dropdown"
          >
            {CONVERT_CATEGORIES.map((c) => (
              <Picker.Item
                key={c.id}
                label={c.title}
                value={c.id}
                color={Platform.OS === 'android' ? colors.text : undefined}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.fieldLabel}>From</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={fromId}
            onValueChange={(v) => setFromId(String(v))}
            style={styles.picker}
            dropdownIconColor={colors.teal}
            mode="dropdown"
          >
            {cat.units.map((u) => (
              <Picker.Item
                key={u.id}
                label={u.label}
                value={u.id}
                color={Platform.OS === 'android' ? colors.text : undefined}
              />
            ))}
          </Picker>
        </View>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Value to convert"
        />

        <Pressable
          style={styles.swapBtn}
          onPress={swap}
          accessibilityLabel="Swap units"
        >
          <MaterialCommunityIcons name="swap-vertical" size={22} color={colors.teal} />
          <Text style={styles.swapText}>Swap</Text>
        </Pressable>

        <Text style={styles.fieldLabel}>To</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={toId}
            onValueChange={(v) => setToId(String(v))}
            style={styles.picker}
            dropdownIconColor={colors.teal}
            mode="dropdown"
          >
            {cat.units.map((u) => (
              <Picker.Item
                key={u.id}
                label={u.label}
                value={u.id}
                color={Platform.OS === 'android' ? colors.text : undefined}
              />
            ))}
          </Picker>
        </View>

        <View style={styles.outputBox}>
          <Text
            style={styles.outputValue}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {output}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.md,
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
    flex: 1,
  },
  bodyContent: {
    paddingBottom: spacing.xl,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  pickerWrap: {
    backgroundColor: colors.graphiteSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text,
    backgroundColor: colors.graphiteSoft,
  },
  input: {
    backgroundColor: colors.graphiteSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  swapBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  swapText: {
    color: colors.teal,
    fontWeight: '600',
  },
  outputBox: {
    backgroundColor: colors.graphiteSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.teal,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    minHeight: 72,
    justifyContent: 'center',
  },
  outputValue: {
    color: colors.teal,
    fontSize: 28,
    fontWeight: '700',
  },
});
