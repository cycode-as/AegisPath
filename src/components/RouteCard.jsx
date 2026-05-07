import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ScoreBar from './ScoreBar';
import ConfidencePill from './ConfidencePill';
import { colors, getRiskColor } from '../config/colors';

export default function RouteCard({ route, onSeeWhy, onNavigate }) {
  const {
    label, emoji, duration, distance,
    safetyScore, riskLevel, narrative,
    badges, isRecommended,
  } = route;

  const scoreColor = getRiskColor(riskLevel);

  // Count-up animation using JS state (reliable across all RN versions)
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    setDisplayScore(0);
    const steps = 20;
    const increment = safetyScore / steps;
    let current = 0;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      current = Math.min(Math.round(increment * count), safetyScore);
      setDisplayScore(current);
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

      {/* Top row */}
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

      {/* Score bar */}
      <ScoreBar safetyScore={safetyScore} riskLevel={riskLevel} />

      {/* Narrative */}
      <Text style={styles.narrative} numberOfLines={2}>{narrative}</Text>

      {/* Badges */}
      <View style={styles.badgeRow}>
        {badges.map((b, i) => (
          <ConfidencePill key={i} icon={b.icon} label={b.label} type={b.type} />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.seeWhyBtn}
          onPress={() => onSeeWhy(route)}
          activeOpacity={0.75}
        >
          <Text style={styles.seeWhyText}>View Risk Details →</Text>
        </TouchableOpacity>

        {isRecommended && (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => onNavigate(route)}
            activeOpacity={0.85}
          >
            <Text style={styles.navText}>Navigate →</Text>
          </TouchableOpacity>
        )}
      </View>

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

  /* Recommended tag */
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

  /* Top row */
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
    minWidth: 0, // prevents overflow
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

  /* Narrative */
  narrative: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 10,
  },

  /* Badges */
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },

  /* Actions */
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  seeWhyBtn: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  seeWhyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand,
  },
  navBtn: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  navText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
