import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getRiskColor } from '../config/colors';

export default function ScoreBar({ safetyScore, riskLevel }) {
  const barColor = getRiskColor(riskLevel);
  const widthPercent = `${safetyScore}%`;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: widthPercent, backgroundColor: barColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
    marginVertical: 8,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});