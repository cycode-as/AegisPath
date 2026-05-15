import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import RouteCard from '../components/RouteCard';
import ConfidencePill from '../components/ConfidencePill';
import DayNightToggle from '../components/DayNightToggle';
import SkeletonCard from '../components/SkeletonCard';
import FactorBar from '../components/FactorBar';
import SOSButton from '../components/SOSButton';
import OfflineBanner from '../components/OfflineBanner';
import NoSafeRouteCard from '../components/NoSafeRouteCard';
import { useRouteStore } from '../stores/useRouteStore';
import { colors, getRiskColor } from '../config/colors';

const FACTORS = [
  { label: 'Crime', key: 'crime' },
  { label: 'Time',  key: 'time'  },
  { label: 'Crowd', key: 'crowd' },
  { label: 'Infra', key: 'infra' },
];

const SheetScrollView = BottomSheetScrollView || ScrollView;

// ─── POI category definitions ─────────────────────────────────────────────────
const SAFE_POI_META    = { icon: '🏪', label: 'Safe POIs',    color: '#15803D', bg: '#DCFCE7', desc: 'Cafes, hospitals, transit, police, supermarkets' };
const NEUTRAL_POI_META = { icon: '🏬', label: 'Neutral POIs', color: '#92400E', bg: '#FEF3C7', desc: 'Banks, shops, places of worship, fast food' };
const CAUTION_POI_META = { icon: '🍺', label: 'Caution POIs', color: '#B91C1C', bg: '#FEE2E2', desc: 'Bars, pubs, nightclubs, liquor shops, casinos' };

// ─── POI Breakdown Card ───────────────────────────────────────────────────────
function POIBreakdown({ confidenceFactors, confidenceTags, timeHour }) {
  const safePOI    = confidenceFactors?.safePOI    ?? 0;
  const neutralPOI = confidenceFactors?.neutralPOI ?? 0;
  const cautionPOI = confidenceFactors?.cautionPOI ?? 0;
  const total      = safePOI + neutralPOI + cautionPOI;

  const isNight = timeHour >= 20 || timeHour < 6;

  // Only render if we have any POI data
  if (total === 0 && (!confidenceTags || confidenceTags.length === 0)) return null;

  const rows = [
    { ...SAFE_POI_META,    count: safePOI    },
    { ...NEUTRAL_POI_META, count: neutralPOI },
    { ...CAUTION_POI_META, count: cautionPOI },
  ].filter(r => r.count > 0);

  return (
    <View style={sheet.poiSection}>
      <Text style={sheet.poiSectionTitle}>Nearby Places on Route</Text>
      <Text style={sheet.poiSectionSub}>
        OSM data within 300m of sampled route points
      </Text>

      {/* POI count rows */}
      {rows.length > 0 && (
        <View style={sheet.poiCard}>
          {rows.map((row, i) => (
            <View
              key={row.label}
              style={[sheet.poiRow, i < rows.length - 1 && sheet.poiRowBorder]}
            >
              <View style={[sheet.poiIconWrap, { backgroundColor: row.bg }]}>
                <Text style={sheet.poiIcon}>{row.icon}</Text>
              </View>
              <View style={sheet.poiTextBlock}>
                <Text style={sheet.poiLabel}>{row.label}</Text>
                <Text style={sheet.poiDesc} numberOfLines={1}>{row.desc}</Text>
              </View>
              <View style={[sheet.poiCountBadge, { backgroundColor: row.bg }]}>
                <Text style={[sheet.poiCount, { color: row.color }]}>{row.count}</Text>
              </View>
            </View>
          ))}

          {/* Caution warning if nighttime + caution POIs present */}
          {cautionPOI > 0 && isNight && (
            <View style={sheet.cautionWarning}>
              <Text style={sheet.cautionWarningIcon}>⚠️</Text>
              <Text style={sheet.cautionWarningText}>
                {cautionPOI} nightlife/alcohol venue{cautionPOI !== 1 ? 's' : ''} active after dark — reduces safety confidence
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Contextual tags from the scoring engine */}
      {confidenceTags && confidenceTags.length > 0 && (
        <View style={sheet.tagsWrap}>
          {confidenceTags.map((tag, i) => {
            const isCaution = tag.includes('Nightlife') || tag.includes('Caution') || tag.includes('Low visibility') || tag.includes('Isolated') || tag.includes('Elevated');
            return (
              <View
                key={`${tag}-${i}`}
                style={[sheet.tagPill, { backgroundColor: isCaution ? '#FEE2E2' : '#EEF2FF' }]}
              >
                <Text style={[sheet.tagText, { color: isCaution ? '#B91C1C' : '#3B5BDB' }]}>
                  {isCaution ? '⚠ ' : '✦ '}{tag}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── RouteDetailSheet ────────────────────────────────────────────────────────
function RouteDetailSheet() {
  const selectedRoute = useRouteStore((s) => s.selectedRoute);

  const op0 = useSharedValue(0);
  const op1 = useSharedValue(0);
  const op2 = useSharedValue(0);
  const op3 = useSharedValue(0);
  const opacities = [op0, op1, op2, op3];

  const a0 = useAnimatedStyle(() => ({ opacity: op0.value }));
  const a1 = useAnimatedStyle(() => ({ opacity: op1.value }));
  const a2 = useAnimatedStyle(() => ({ opacity: op2.value }));
  const a3 = useAnimatedStyle(() => ({ opacity: op3.value }));
  const animStyles = [a0, a1, a2, a3];

  useEffect(() => {
    if (!selectedRoute) return;
    opacities.forEach((sv, i) => {
      sv.value = 0;
      sv.value = withDelay(i * 120, withTiming(1, { duration: 400 }));
    });
  }, [selectedRoute]);

  if (!selectedRoute) return null;

  const {
    label = 'Selected',
    emoji = '',
    safetyScore = 0,
    riskLevel,
    factors = {},
    badges = [],
    narrative = '',
    confidenceFactors = {},
    confidenceTags = [],
    timeHour = 14,
  } = selectedRoute;
  const detectedCount = FACTORS.filter(f => factors[f.key] >= 35).length;

  return (
    <SheetScrollView contentContainerStyle={sheet.content}>
      <View style={sheet.summaryRow}>
        <View style={sheet.summaryText}>
          <Text style={sheet.routeTitle}>{`${emoji} ${label.toUpperCase()}`.trim()}</Text>
          <Text style={sheet.routeNarrative}>{narrative}</Text>
        </View>
        <View style={sheet.scoreBadge}>
          <Text style={sheet.scoreLabel}>Score</Text>
          <Text style={[sheet.scoreValue, { color: getRiskColor(riskLevel) }]}>
            {safetyScore}
          </Text>
        </View>
      </View>

      {badges.length > 0 && (
        <View style={sheet.badgeRow}>
          {badges.map((badge, i) => (
            <ConfidencePill
              key={`${badge.label}-${i}`}
              icon={badge.icon}
              label={badge.label}
              type={badge.type}
            />
          ))}
        </View>
      )}

      {/* ── POI Breakdown ── */}
      <POIBreakdown
        confidenceFactors={confidenceFactors}
        confidenceTags={confidenceTags}
        timeHour={timeHour}
      />

      <Text style={sheet.title}>Risk Analysis</Text>
      <Text style={sheet.sub}>Why this route may be unsafe</Text>

      <View style={[sheet.riskBanner, { backgroundColor: getRiskColor(riskLevel) }]}>
        <Text style={sheet.riskBannerLabel}>SAFETY CONFIDENCE</Text>
        <Text style={sheet.riskBannerTitle}>
          {riskLevel} • {detectedCount} factor{detectedCount !== 1 ? 's' : ''} detected
        </Text>
        <Text style={sheet.riskBannerSub}>
          AegisPath analyzed crowd, lighting, isolation & emergency data along the {label.toLowerCase()} route.
        </Text>
      </View>

      <View style={sheet.factorsCard}>
        {FACTORS.map(({ label: fl, key }, i) => (
          <Animated.View key={key} style={animStyles[i]}>
            <FactorBar label={fl} value={factors[key]} />
          </Animated.View>
        ))}
      </View>
    </SheetScrollView>
  );
}

const sheet = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  sub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  riskBanner: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  riskBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  riskBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  riskBannerSub: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
    opacity: 0.95,
  },
  factorsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  routeNarrative: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  scoreBadge: {
    minWidth: 64,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },

  // ── POI Breakdown ──────────────────────────────────────────────────────────
  poiSection: {
    marginBottom: 20,
  },
  poiSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  poiSectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  poiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  poiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  poiRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  poiIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  poiIcon: { fontSize: 18 },
  poiTextBlock: { flex: 1, minWidth: 0 },
  poiLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 1,
  },
  poiDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  poiCountBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  poiCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  cautionWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderTopWidth: 1,
    borderTopColor: '#FED7AA',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cautionWarningIcon: { fontSize: 14, marginTop: 1 },
  cautionWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    fontWeight: '500',
  },

  // ── Contextual tags ────────────────────────────────────────────────────────
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// ─── RouteComparisonScreen ────────────────────────────────────────────────────
export default function RouteComparisonScreen({ navigation }) {
  const {
    routes, isLoading, timeMode, error, source, destination,
    sourceCoords, destCoords,
    fetchRoutes, setTimeMode, setSelectedRoute,
  } = useRouteStore();

  const bottomSheetRef = useRef(null);
  const [noSafeRouteDismissed, setNoSafeRouteDismissed] = useState(false);

  // Guard: if no coordinates, can't fetch routes
  const hasCoords = sourceCoords && destCoords;
  const hasDisplayableRouteData = routes.length > 0;

  // Fetch routes on mount when coordinates are available
  useEffect(() => {
    if (hasCoords) {
      fetchRoutes();
    }
  }, []);

  // Detect if all routes are high risk
  const allHighRisk = routes.length > 0 && routes.every(r => r.riskLevel === 'HIGH');
  const showNoSafeRoute = allHighRisk && !noSafeRouteDismissed;

  const handleSeeWhy = (route) => {
    setSelectedRoute(route);
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleNavigate = (route) => {
    setSelectedRoute(route);
    navigation.navigate('Navigation');
  };

  const handleTimeImpact = (route) => {
    navigation.navigate('TimeImpact', { route });
  };

  const sorted = [...routes].sort((a) => (a.isRecommended ? -1 : 1));

  return (
    <GestureHandlerRootView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <OfflineBanner />

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.title}>Route Comparison</Text>
            <Text style={s.subtitle} numberOfLines={1}>
              {source && destination ? `${source.split(',')[0]} → ${destination.split(',')[0]}` : 'Safest vs Fastest'}
            </Text>
          </View>

          <DayNightToggle timeMode={timeMode} onToggle={setTimeMode} />
        </View>

        {/* ── No coordinates guard ── */}
        {!hasCoords && !hasDisplayableRouteData ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📍</Text>
            <Text style={s.emptyTitle}>No trip selected</Text>
            <Text style={s.emptySub}>Please search for source and destination to compare routes.</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.85}
            >
              <Text style={s.emptyBtnText}>← Go to Search</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
          >
            <View testID="skeleton-card"><SkeletonCard /></View>
            <View testID="skeleton-card"><SkeletonCard /></View>
          </ScrollView>
        ) : error ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>⚠️</Text>
            <Text style={s.emptyTitle}>Route Error</Text>
            <Text style={s.emptySub}>{error}</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={fetchRoutes}
              activeOpacity={0.85}
            >
              <Text style={s.emptyBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : routes.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🔍</Text>
            <Text style={s.emptyTitle}>No routes found</Text>
            <Text style={s.emptySub}>Could not find routes between these locations.</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={fetchRoutes}
              activeOpacity={0.85}
            >
              <Text style={s.emptyBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {showNoSafeRoute && (
              <NoSafeRouteCard
                onDismiss={() => setNoSafeRouteDismissed(true)}
                navigation={navigation}
              />
            )}
            <FlatList
              style={s.scroll}
              data={sorted}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View testID="route-card">
                  <RouteCard
                    route={item}
                    onSeeWhy={handleSeeWhy}
                    onNavigate={handleNavigate}
                    onTimeImpact={handleTimeImpact}
                  />
                </View>
              )}
            />
          </>
        )}
      </SafeAreaView>

      {/* ── Bottom Sheet ── */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['55%', '88%']}
        index={-1}
        enablePanDownToClose
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.handleIndicator}
      >
        <RouteDetailSheet />
      </BottomSheet>

      {/* ── SOS Button ── */}
      <SOSButton
        onLongPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          navigation.navigate('SOS');
        }}
      />
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: {
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
  backIcon: {
    fontSize: 18,
    color: '#0F172A',
    lineHeight: 22,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 110,
  },

  /* Empty states */
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  sheetBg: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: '#CBD5E1',
    width: 40,
    height: 4,
  },
});
