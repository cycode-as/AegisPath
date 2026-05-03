import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.lineShort} />
      <View style={styles.scoreLine} />
      <View style={styles.bar} />
      <View style={styles.lineLong} />
      <View style={styles.lineMid} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    height: 180,
  },
  lineShort: { height: 12, width: '30%', backgroundColor: '#CBD5E1', borderRadius: 6, marginBottom: 12 },
  scoreLine: { height: 40, width: '25%', backgroundColor: '#CBD5E1', borderRadius: 8, marginBottom: 12 },
  bar:       { height: 6,  width: '100%', backgroundColor: '#CBD5E1', borderRadius: 6, marginBottom: 12 },
  lineLong:  { height: 10, width: '90%', backgroundColor: '#CBD5E1', borderRadius: 6, marginBottom: 8 },
  lineMid:   { height: 10, width: '65%', backgroundColor: '#CBD5E1', borderRadius: 6 },
});