import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../config/colors';

export default function DayNightToggle({ timeMode, onToggle }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.pill, timeMode === 'day' && styles.active]}
        onPress={() => onToggle('day')}
      >
        <Text style={[styles.text, timeMode === 'day' && styles.activeText]}>
          🌤 Day
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.pill, timeMode === 'night' && styles.active]}
        onPress={() => onToggle('night')}
      >
        <Text style={[styles.text, timeMode === 'night' && styles.activeText]}>
          🌙 Night
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    padding: 3,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  active: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});