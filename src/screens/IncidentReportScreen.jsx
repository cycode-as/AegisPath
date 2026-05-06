/**
 * IncidentReportScreen — Phase 4 (P1)
 *
 * 4 incident type tiles + severity toggle → submit → 0.8s spinner → success.
 * Nothing is stored. The success screen is the feature.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../config/colors';

const INCIDENT_TYPES = [
  { id: 'harassment', icon: '😟', label: 'Harassment'         },
  { id: 'theft',      icon: '🔪', label: 'Theft / Robbery'    },
  { id: 'dark',       icon: '🌑', label: 'Dark Area'          },
  { id: 'suspicious', icon: '👁',  label: 'Suspicious Activity'},
];

const SEVERITIES = ['Low', 'Medium', 'High'];

export default function IncidentReportScreen({ navigation }) {
  const [selectedType,     setSelectedType]     = useState(null);
  const [selectedSeverity, setSelectedSeverity] = useState('Medium');
  const [phase,            setPhase]            = useState('form'); // 'form' | 'loading' | 'success'

  const handleSubmit = () => {
    if (!selectedType) return;
    setPhase('loading');
    setTimeout(() => setPhase('success'), 800);
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (phase === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successInner}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Thank you.</Text>
          <Text style={styles.successBody}>
            This helps others stay safe on this route.
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading screen ───────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successInner}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Submitting report…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Help others stay safe.</Text>
        <Text style={styles.subheading}>Report what you saw.</Text>

        {/* Type tiles */}
        <View style={styles.tilesGrid}>
          {INCIDENT_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[styles.tile, isSelected && styles.tileSelected]}
                onPress={() => setSelectedType(type.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.tileIcon}>{type.icon}</Text>
                <Text style={[styles.tileLabel, isSelected && styles.tileLabelSelected]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Severity */}
        <Text style={styles.sectionLabel}>Severity</Text>
        <View style={styles.severityRow}>
          {SEVERITIES.map((sev) => {
            const isSelected = selectedSeverity === sev;
            return (
              <TouchableOpacity
                key={sev}
                style={[styles.severityBtn, isSelected && styles.severityBtnSelected]}
                onPress={() => setSelectedSeverity(sev)}
              >
                <Text style={[styles.severityText, isSelected && styles.severityTextSelected]}>
                  {sev}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !selectedType && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedType}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>Submit Report</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backBtn: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 15,
    color: colors.brand,
    fontWeight: '600',
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  tile: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: {
    borderColor: colors.brand,
    backgroundColor: '#EEF2FF',
  },
  tileIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tileLabelSelected: {
    color: colors.brand,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 36,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  severityBtnSelected: {
    borderColor: colors.brand,
    backgroundColor: '#EEF2FF',
  },
  severityText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  severityTextSelected: {
    color: colors.brand,
  },
  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Success / loading
  successInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  successBody: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  doneBtn: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 56,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.textSecondary,
  },
});
