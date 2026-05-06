import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../config/colors';

/**
 * SOSButton — floating emergency action button.
 *
 * Positioned absolutely in the bottom-right corner of its parent.
 * A long press of 1000ms invokes the `onLongPress` callback.
 *
 * Props:
 *   onLongPress {() => void} — callback fired after a 1000ms long press
 */
export default function SOSButton({ onLongPress }) {
  return (
    <TouchableOpacity
      testID="sos-button"
      style={styles.button}
      onLongPress={onLongPress}
      delayLongPress={1000}
      activeOpacity={0.8}
    >
      <Text style={styles.label}>SOS</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    backgroundColor: colors.highRisk,
    borderRadius: 999,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    // Android shadow
    elevation: 8,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
