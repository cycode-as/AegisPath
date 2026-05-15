import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ScoreBar from './ScoreBar';
import ConfidencePill from './ConfidencePill';
import { colors, getRiskColor } from '../config/colors';

// ─── Derive up to 2 contextual explanation chips from route data ──────────────
function getExplanationChips(route) {
  const {
    safetyScore = 50,
    riskLevel = 'MODERATE',
    confidenceFactors = {},
    confidenceTags = [],
    timeHour = 14,
    factors = {},
  } = route;

  const chips = [];
  const isNight = timeHour >= 20 || timeHour < 6;
  const cautionPOI  = confidenceFactors.cautionPOI  ?? 0;
  const safePOI     = confidenceFactors.safePOI     ?? 0;
  const incidentVal = confidenceFactors.incident    ?? factors.crime ?? 0;
  const emergency   = confidenceFactors.emergency   ?? 0;
  const isolation   = confidenceFactors.isolation   ?? 0;
  const crowd       = confidenceFactors.crowd       ?? 0;

  // Priority 1 — caution zone at night
  if (cautionPOI >= 2 && isNight) {
    chips.push({ label: 'Nightlife-heavy area detected', type: 'caution', icon: '⚠' });
  } else if (cautionPOI >= 3) {
    chips.push({ label: 'Nightlife-heavy area detected', type: 'caution', icon: '⚠' });
  }

  // Priority 2 — incident exposure
  if (incidentVal >= 20) {
    chips.push({ label: 'Incident zone nearby', type: 'caution', icon: '⚠' });
  }

  // Priority 3 — positive signals (only if no caution chips yet or need 2nd)
  if (chips.length < 2) {
    if (safePOI >= 5 || confidenceTags.includes('Active commercial zone')) {
      chips.push({ label: 'Well-monitored commercial corridor', type: 'safe', icon: '✦' });
    } else if (emergency >= 50) {
      chips.push({ label: 'High emergency accessibility', type: 'safe', icon: '✦' });
    } else if (isolation < 20 && crowd >= 50) {
      chips.push({ label: 'Lower isolation risk', type: 'safe', icon: '✦' });
    } else if (safetyScore >= 65) {
      chips.push({ label: 'Contextually safe corridor', type: 'safe', icon: '✦' });
    }
  }

  // Priority 4 — fill second slot with a negative if still empty
  if (chips.length < 2) {
    if (isolation >= 40) {
      chips.push({ label: 'Isolated stretches ahead', type: 'caution', icon: '⚠' });
    } else if (isNight && safetyScore < 50) {
      chips.push({ label: 'Late-night confidence reduced', type: 'caution', icon: '⚠' });
    } else if (emergency >= 50 && chips.every(c => c.label !== 'High emergency accessibility')) {
      chips.push({ label: 'High emergency accessibility', type: 'safe', icon: '✦' });
    }
  }

  return chips.slice(0, 2);
}

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

  const explanationChips = getExplanationChips(route);

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
          <Text style={styles.safetyLabel}>Safety Confidence</Text>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{displayScore}</Text>
        </View>
      </View>

      {/* Animated score bar */}
      <ScoreBar safetyScore={safetyScore} riskLevel={riskLevel} />

      {/* ── Contextual explanation chips ── */}
      {explanationChips.length > 0 && (
        <View style={styles.chipRow}>
          {explanationChips.map((chip, i) => {
            const isCaution = chip.type === 'caution';
            return (
              <View
                key={i}
                style={[
                  styles.chip,
                  isCaution ? styles.chipCaution : styles.chipSafe,
                ]}
              >
                <Text style={[styles.chipText, isCaution ? styles.chipTextCaution : styles.chipTextSafe]}>
                  {chip.icon} {chip.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Narrative preview */}
      <Text style={styles.narrative} numberOfLines={2}>{narrative}</Text>

      {/* Confidence badges */}
      <View style={styles.badgeRow}>
        {badges.map((b, i) => (
          <ConfidencePill key={i} icon={b.icon} label={b.label} type={b.type} />
        ))}
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.riskBtn}
          onPress={() => onSeeWhy(route)}
          activeOpacity={0.75}
        >
          <Text style={styles.riskBtnText} numberOfLines={1}>See Why →</Text>
        </TouchableOpacity>

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
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  scoreNum: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },

  // ── Explanation chips ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 2,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipSafe: {
    backgroundColor: '#EEF2FF',
  },
  chipCaution: {
    backgroundColor: '#FFF7ED',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextSafe: {
    color: '#3B5BDB',
  },
  chipTextCaution: {
    color: '#92400E',
  },

  narrative: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 10,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 14,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

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

  navBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPrimary:   { backgroundColor: colors.brand },
  navBtnSecondary: { backgroundColor: '#EEF2FF' },
  navBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navBtnTextPrimary:   { color: '#FFFFFF' },
  navBtnTextSecondary: { color: colors.brand },
});
