/**
 * SOSScreen — full-screen SOS emergency view.
 *
 * Feature: aegispath-phase2-phase3
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 11.1, 11.2, 11.3
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../config/colors';
import { sendSOS } from '../services/sendSOS';
import { useRouteStore } from '../stores/useRouteStore';

export default function SOSScreen({ navigation }) {
  const [done, setDone] = useState(false);
  const setSosActive = useRouteStore((state) => state.setSosActive);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // 1. Fire-and-forget SOS send
    sendSOS();

    // 2. Start pulse animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 600 }),
        withTiming(1.0, { duration: 600 })
      ),
      -1
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 600 }),
        withTiming(1.0, { duration: 600 })
      ),
      -1
    );

    // 3. Transition to done state after 1500ms
    const timer = setTimeout(() => setDone(true), 1500);

    return () => clearTimeout(timer);
  }, []);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleImSafe = () => {
    setSosActive(false);
    navigation.navigate('Home');
  };

  if (!done) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.pulseCircle, animatedCircleStyle]} />
        <Text style={styles.sendingText}>Sending Alert…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.checkmark}>✓</Text>
      <Text style={styles.alertSentText}>Alert Sent</Text>
      <TouchableOpacity style={styles.safeButton} onPress={handleImSafe}>
        <Text style={styles.safeButtonText}>I'm Safe Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.highRisk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 32,
  },
  sendingText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 80,
    fontWeight: '800',
    marginBottom: 16,
  },
  alertSentText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 40,
  },
  safeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  safeButtonText: {
    color: colors.highRisk,
    fontSize: 16,
    fontWeight: '700',
  },
});
