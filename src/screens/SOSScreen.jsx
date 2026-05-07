import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const STATUS_ITEMS = [
  {
    icon: '📍',
    iconBg: '#DCFCE7',
    title: 'Location shared',
    sub: '28.5494° N, 77.2001° E',
    done: true,
  },
  {
    icon: '💬',
    iconBg: '#DCFCE7',
    title: 'Notifying emergency contacts',
    sub: 'Mom • Priya • Dad',
    done: true,
  },
  {
    icon: '📞',
    iconBg: '#FEF3C7',
    title: 'Connecting to nearest unit',
    sub: 'Police PCR • 0.8 km away',
    done: false,
  },
];

export default function SOSScreen({ navigation }) {
  const [done, setDone] = useState(false);
  const setSosActive = useRouteStore((state) => state.setSosActive);

  const scale = useSharedValue(1);
  const outerScale = useSharedValue(1);

  const startFlow = () => {
    setDone(false);
    sendSOS();
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700 }),
        withTiming(1.0,  { duration: 700 }),
      ), -1,
    );
    outerScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 900 }),
        withTiming(1.0,  { duration: 900 }),
      ), -1,
    );
  };

  useEffect(() => {
    startFlow();
    const timer = setTimeout(() => setDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleRestart = () => {
    startFlow();
    setTimeout(() => setDone(true), 1500);
  };

  const innerCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const outerCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }],
    opacity: 0.25,
  }));

  const handleImSafe = () => {
    setSosActive(false);
    navigation.navigate('Home');
  };

  if (!done) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF5F5" />

        {/* Top nav */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.navBtn} onPress={handleImSafe}>
            <Text style={styles.navBtnIcon}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.restartBtn} onPress={handleRestart}>
            <Text style={styles.restartText}>↺  Restart</Text>
          </TouchableOpacity>
        </View>

        {/* Pulsing icon area */}
        <View style={styles.pulseArea}>
          <Animated.View style={[styles.outerRing, outerCircleStyle]} />
          <Animated.View style={[styles.innerCircle, innerCircleStyle]}>
            <Text style={styles.alarmEmoji}>🚨</Text>
          </Animated.View>
        </View>

        {/* Title */}
        <Text style={styles.alertTitle}>Emergency Alert Activated</Text>
        <Text style={styles.alertSub}>
          Help is on the way. Stay calm and stay{'\n'}where you are if safe.
        </Text>

        {/* Status list */}
        <View style={styles.statusCard}>
          {STATUS_ITEMS.map((item, i) => (
            <View key={i} style={[styles.statusRow, i < STATUS_ITEMS.length - 1 && styles.statusRowBorder]}>
              <View style={[styles.statusIcon, { backgroundColor: item.iconBg }]}>
                <Text style={styles.statusEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>{item.title}</Text>
                <Text style={styles.statusSub}>{item.sub}</Text>
              </View>
              {item.done ? (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              ) : (
                <View style={styles.spinnerCircle}>
                  <Text style={styles.spinnerDot}>◌</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Incoming call banner */}
        <View style={styles.callBanner}>
          <View style={styles.callIconWrap}>
            <Text style={styles.callIcon}>📞</Text>
          </View>
          <View style={styles.callText}>
            <Text style={styles.callLabel}>INCOMING CALL</Text>
            <Text style={styles.callTitle}>Police Assistance • 112</Text>
          </View>
          <View style={styles.callDot} />
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.emergencyBtn} activeOpacity={0.85}>
          <Text style={styles.emergencyBtnText}>📞  Call Emergency Services</Text>
        </TouchableOpacity>

      </SafeAreaView>
    );
  }

  // Done state
  return (
    <SafeAreaView style={styles.doneContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FFF4" />
      <View style={styles.doneInner}>
        <View style={styles.doneCheckWrap}>
          <Text style={styles.doneCheck}>✓</Text>
        </View>
        <Text style={styles.doneTitle}>Alert Sent.</Text>
        <Text style={styles.doneSub}>Your contacts have been notified</Text>
        <TouchableOpacity style={styles.safeBtn} onPress={handleImSafe} activeOpacity={0.85}>
          <Text style={styles.safeBtnText}>I'm Safe Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 20,
  },

  /* Top nav */
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 16,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  navBtnIcon: { fontSize: 20, color: '#0F172A' },
  restartBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  restartText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },

  /* Pulse area */
  pulseArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    marginBottom: 20,
  },
  outerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EF4444',
  },
  innerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  alarmEmoji: { fontSize: 30 },

  /* Text */
  alertTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  alertSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  /* Status card */
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  statusRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusEmoji: { fontSize: 18 },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  statusSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  spinnerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerDot: { color: '#F59E0B', fontSize: 16 },

  /* Call banner */
  callBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  callIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIcon: { fontSize: 18 },
  callText: { flex: 1 },
  callLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  callTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  callDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },

  /* Emergency CTA */
  emergencyBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Done state */
  doneContainer: {
    flex: 1,
    backgroundColor: '#F0FFF4',
  },
  doneInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  doneCheckWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  doneCheck: { fontSize: 48, color: '#FFFFFF' },
  doneTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  doneSub: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 40,
    textAlign: 'center',
  },
  safeBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  safeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
