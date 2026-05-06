import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../config/colors';

export default function DayNightToggle({ timeMode, onToggle }) {
  const [pillWidth, setPillWidth] = useState(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (pillWidth === 0) return;
    const target = timeMode === 'night' ? pillWidth : 0;
    translateX.value = withSpring(target, { stiffness: 200, damping: 20 });
  }, [timeMode, pillWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleContainerLayout = (e) => {
    const containerWidth = e.nativeEvent.layout.width;
    // Each pill takes half the container width (two equal pills)
    const computedPillWidth = containerWidth / 2;
    if (computedPillWidth !== pillWidth) {
      setPillWidth(computedPillWidth);
    }
  };

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      {/* Sliding animated indicator — absolutely positioned behind the text pills */}
      {pillWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            styles.active,
            styles.indicator,
            { width: pillWidth },
            animatedIndicatorStyle,
          ]}
        />
      )}

      <TouchableOpacity
        style={styles.pill}
        onPress={() => onToggle('day')}
      >
        <Text style={[styles.text, timeMode === 'day' && styles.activeText]}>
          🌤 Day
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.pill}
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
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
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
