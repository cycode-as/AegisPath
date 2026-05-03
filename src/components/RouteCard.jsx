import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ScoreBar       from './ScoreBar';
import ConfidencePill from './ConfidencePill';
import { colors, getRiskColor } from '../config/colors';

export default function RouteCard({ route, onSeeWhy, onNavigate }) {
  const { label, emoji, duration, distance,
          safetyScore, riskLevel, narrative,
          badges, isRecommended } = route;

  const scoreColor  = getRiskColor(riskLevel);
  const borderColor = isRecommended ? colors.brandBorder : colors.cardBorder;
  const elevation   = isRecommended ? 6 : 1;

  return (
    <View style={[styles.card, { borderColor, elevation }]}>

      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.label}>{emoji} {label.toUpperCase()}</Text>
        {isRecommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
          </View>
        )}
      </View>

      {/* Score + meta */}
      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: scoreColor }]}>{safetyScore}</Text>
        <View style={styles.meta}>
          <Text style={styles.riskLevel}>{riskLevel} RISK</Text>
          <Text style={styles.metaText}>{duration}  ·  {distance}</Text>
        </View>
      </View>

      {/* Score bar */}
      <ScoreBar safetyScore={safetyScore} riskLevel={riskLevel} />

      {/* Narrative preview */}
      <Text style={styles.narrative} numberOfLines={2}>{narrative}</Text>

      {/* Badges */}
      <View style={styles.badgeRow}>
        {badges.map((b, i) => (
          <ConfidencePill key={i} icon={b.icon} label={b.label} type={b.type} />
        ))}
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.seeWhyBtn} onPress={() => onSeeWhy(route)}>
        <Text style={styles.seeWhyText}>See Why →</Text>
      </TouchableOpacity>

      {isRecommended && (
        <TouchableOpacity style={styles.navigateBtn} onPress={() => onNavigate(route)}>
          <Text style={styles.navigateText}>Navigate This Route →</Text>
        </TouchableOpacity>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  recommendedBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  score: {
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 56,
  },
  meta: {
    flex: 1,
  },
  riskLevel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  narrative: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  seeWhyBtn: {
    paddingVertical: 6,
  },
  seeWhyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand,
  },
  navigateBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  navigateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});