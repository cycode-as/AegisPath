import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../config/colors';

/**
 * Returns the fill colour for a FactorBar based on the value.
 * value < 35  → colors.safe
 * value < 60  → colors.moderate
 * value >= 60 → colors.highRisk
 *
 * @param {number} value - integer 0–100
 * @returns {string} hex colour string
 */
export function getFactorBarColor(value) {
  if (value < 35) return colors.safe;
  if (value < 60) return colors.moderate;
  return colors.highRisk;
}

/**
 * FactorBar — animated horizontal progress bar for a single safety factor.
 *
 * Props:
 *   label {string}  — display name (e.g. "Crime")
 *   value {number}  — integer 0–100
 */
export default function FactorBar({ label, value }) {
  const fillWidth = useSharedValue(0);
  const [trackWidth, setTrackWidth] = useState(0);

  // Once the track has been measured, animate the fill to the target width.
  useEffect(() => {
    if (trackWidth > 0) {
      const targetWidth = (value / 100) * trackWidth;
      fillWidth.value = withTiming(targetWidth, { duration: 600 });
    }
  }, [trackWidth, value]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: fillWidth.value,
  }));

  const fillColor = getFactorBarColor(value);

  return (
    <View style={styles.container}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.percentage}>{value}%</Text>
      </View>

      {/* Track */}
      <View
        testID="factor-bar-track"
        style={styles.track}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View
          testID="factor-bar-fill"
          style={[styles.fill, animatedFillStyle, { backgroundColor: fillColor }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  percentage: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  track: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
