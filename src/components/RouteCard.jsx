import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ScoreBar from './ScoreBar';
import ConfidencePill from './ConfidencePill';
import { colors, getRiskColor } from '../config/colors';

export default function RouteCard({ route, onSeeWhy, onNavigate, onTimeImpact }) {
  const {
    label, emoji, duration, distance,
    safetyScore, riskLevel, narrative,
    badges, isRecommended,
  } = route;

  const scoreColor = getRiskColor(riskLevel);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const steps = 20;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setDisplayScore(Math.min(Math.round((safetyScore / steps) * count), safetyScore));
      if (count >= steps) clearInterval(interval);
    }, 500 / steps);
    return () => clearInterval(interval);
  }, [safetyScore]);

  return (
    <View style={[styles.card, isRecommended && styles.cardRecommended]}>

      {/* Recommended tag */}
      {isRecommended && (
        <View style={styles.recTag}>
          <Text style={styles.recTagText}>✓ RECOMMENDED</Text>
        </View>
      )}

      {/* Top row: icon + label + score */}
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, isRecommended ? styles.iconSafe : styles.iconDefault]}>
          <Text style={styles.iconEmoji}>{emoji}</Text>
        </View>
        <View style={styles.routeInfo}>
          <Text style={styles.routeLabel} numberOfLines={1}>{label} Route</Text>
          <Text style={styles.metaText}>🕐 {duration}  ·  {distance}</Text>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={styles.safetyLabel}>SAFETY</Text>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{displayScore}</Text>
        </View>
      </View>

      {/* Animated score bar */}
      <ScoreBar safetyScore={safetyScore} riskLevel={riskLevel} />

      {/* Narrative preview */}
      <Text style={styles.narrative} numberOfLines={2}>{narrative}</Text>

      {/* Confidence badges */}
      <View style={styles.badgeRow}>
        {badges.map((b, i) => (
          <ConfidencePill key={i} icon={b.icon} label={b.label} type={b.type} />
        ))}
      </View>

      {/* ── Action buttons — always visible, never disappear ── */}
      <View style={styles.actionsRow}>
        {/* View Risk Details */}
        <TouchableOpacity
          style={styles.riskBtn}
          onPress={() => onSeeWhy(route)}
          activeOpacity={0.75}
        >
          <Text style={styles.riskBtnText} numberOfLines={1}>🔍 Risk Details</Text>
        </TouchableOpacity>

        {/* Check Time Impact */}
        <TouchableOpacity
          style={styles.timeBtn}
          onPress={() => onTimeImpact && onTimeImpact(route)}
          activeOpacity={0.75}
        >
          <Text style={styles.timeBtnText} numberOfLines={1}>🕐 Time Impact</Text>
        </TouchableOpacity>
      </View>

      {/* Navigate — full width below */}
      <TouchableOpacity
        style={[styles.navBtn, isRecommended ? styles.navBtnPrimary : styles.navBtnSecondary]}
        onPress={() => onNavigate(route)}
        activeOpacity={0.85}
      >
        <Text style={[styles.navBtnText, isRecommended ? styles.navBtnTextPrimary : styles.navBtnTextSecondary]} numberOfLines={1}>
          Navigate This Route →
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRecommended: {
    borderColor: '#22C55E',
    backgroundColor: '#FAFFFE',
    shadowColor: '#22C55E',
    shadowOpacity: 0.15,
    elevation: 4,
  },

  recTag: {
    alignSelf: 'flex-end',
    backgroundColor: '#22C55E',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  recTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconSafe:    { backgroundColor: '#DCFCE7' },
  iconDefault: { backgroundColor: '#EEF2FF' },
  iconEmoji:   { fontSize: 22 },

  routeInfo: {
    flex: 1,
    minWidth: 0,
  },
  routeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },

  scoreBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  safetyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  scoreNum: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },

  narrative: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 10,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 14,
  },

  /* ── Action buttons ── */
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  /* View Risk Details button */
  riskBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },

  /* Check Time Impact button */
  timeBtn: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },

  /* Navigate button — full width */
  navBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPrimary: {
    backgroundColor: colors.brand,
  },
  navBtnSecondary: {
    backgroundColor: '#EEF2FF',
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navBtnTextPrimary: {
    color: '#FFFFFF',
  },
  navBtnTextSecondary: {
    color: colors.brand,
  },
});
