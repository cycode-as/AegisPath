import React from 'react';
import {
  View, Text, TextInput,
  TouchableOpacity, StyleSheet, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../config/colors';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <View style={s.logoBox}>
              <Text style={s.logoEmoji}>🛡</Text>
            </View>
            <View>
              <Text style={s.appName}>
                <Text style={{ color: colors.textPrimary }}>Aegis</Text>
                <Text style={{ color: colors.brand }}>Path</Text>
              </Text>
              <Text style={s.aiLabel}>AI</Text>
            </View>
          </View>
          <TouchableOpacity style={s.bellBtn} activeOpacity={0.7} onPress={() => navigation.navigate('IncidentReport')}>
            <Text style={s.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <Text style={s.helloText}>Hello,</Text>
          <Text style={s.heroTitle}>
            <Text style={s.heroStay}>STAY </Text>
            <Text style={s.heroSafe}>SAFE</Text>
          </Text>
          <Text style={s.heroSub}>
            Navigate safer, not just faster — AI-powered safe route planning.
          </Text>
          <View style={s.aiBadge}>
            <Text style={s.aiBadgeText}>✦ AI Safety Engine • Online</Text>
          </View>
        </View>

        {/* ── Route form card ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>PLAN YOUR ROUTE</Text>

          {/* Start input */}
          <View style={s.inputRow}>
            <View style={s.inputIconWrap}>
              <Text style={s.inputIcon}>📍</Text>
            </View>
            <View style={s.inputTextWrap}>
              <Text style={s.inputLabel}>START</Text>
              <TextInput
                style={s.input}
                defaultValue="Connaught Place"
                placeholder="From"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {/* Connector */}
          <View style={s.connector}>
            <View style={s.dot} />
            <View style={s.dot} />
            <View style={s.dot} />
          </View>

          {/* Destination input */}
          <View style={s.inputRow}>
            <View style={[s.inputIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Text style={s.inputIcon}>🚩</Text>
            </View>
            <View style={s.inputTextWrap}>
              <Text style={s.inputLabel}>DESTINATION</Text>
              <TextInput
                style={s.input}
                defaultValue="Lajpat Nagar Metro"
                placeholder="To"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <TouchableOpacity
            style={s.cta}
            onPress={() => navigation.navigate('RouteComparison')}
            activeOpacity={0.85}
          >
            <Text style={s.ctaText}>Find Safe Route →</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statValue}>2.4M</Text>
            <Text style={s.statLabel}>Routes saved</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>98%</Text>
            <Text style={s.statLabel}>Accuracy</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>24/7</Text>
            <Text style={s.statLabel}>Live data</Text>
          </View>
        </View>

        <Text style={s.poweredBy}>Powered by AegisPath AI</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 22 },
  appName: { fontSize: 18, fontWeight: '800' },
  aiLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bellIcon: { fontSize: 18 },

  /* Hero */
  hero: { marginBottom: 24 },
  helloText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 42,
    marginBottom: 8,
  },
  heroStay: { color: colors.textPrimary, fontStyle: 'italic' },
  heroSafe: { color: colors.brand, fontStyle: 'italic' },
  heroSub: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8EDFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  aiBadgeText: {
    fontSize: 12,
    color: colors.brand,
    fontWeight: '600',
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  inputIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inputIcon: { fontSize: 16 },
  inputTextWrap: { flex: 1, minWidth: 0 },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  input: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    padding: 0,
  },
  connector: {
    paddingLeft: 30,
    paddingVertical: 5,
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 3,
  },
  cta: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  poweredBy: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
  },
});
