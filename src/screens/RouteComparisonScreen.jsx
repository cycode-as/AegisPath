import React, { useEffect, useRef, useCallback, useState } from 'react';
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
import DayNightToggle from '../components/DayNightToggle';
import SkeletonCard from '../components/SkeletonCard';
import FactorBar from '../components/FactorBar';
import SOSButton from '../components/SOSButton';
import OfflineBanner from '../components/OfflineBanner';
import { useRouteStore } from '../stores/useRouteStore';
import { colors, getRiskColor } from '../config/colors';

const FACTORS = [
  { label: 'Crime', key: 'crime' },
  { label: 'Time',  key: 'time'  },
  { label: 'Crowd', key: 'crowd' },
  { label: 'Infra', key: 'infra' },
];

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

  const { label, riskLevel, factors } = selectedRoute;
  const detectedCount = FACTORS.filter(f => factors[f.key] >= 35).length;

  return (
    <BottomSheetScrollView contentContainerStyle={sheet.content}>
      <Text style={sheet.title}>Risk Analysis</Text>
      <Text style={sheet.sub}>Why this route may be unsafe</Text>

      <View style={[sheet.riskBanner, { backgroundColor: getRiskColor(riskLevel) }]}>
        <Text style={sheet.riskBannerLabel}>OVERALL RISK</Text>
        <Text style={sheet.riskBannerTitle}>
          {riskLevel} • {detectedCount} factor{detectedCount !== 1 ? 's' : ''} detected
        </Text>
        <Text style={sheet.riskBannerSub}>
          Our AI scanned crime, lighting, crowd & temporal data along the {label.toLowerCase()} route.
        </Text>
      </View>

      <View style={sheet.factorsCard}>
        {FACTORS.map(({ label: fl, key }, i) => (
          <Animated.View key={key} style={animStyles[i]}>
            <FactorBar label={fl} value={factors[key]} />
          </Animated.View>
        ))}
      </View>
    </BottomSheetScrollView>
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
});

// ─── RouteComparisonScreen ────────────────────────────────────────────────────
export default function RouteComparisonScreen({ navigation }) {
  const {
    routes, isLoading, timeMode,
    fetchRoutes, setTimeMode, setSelectedRoute,
  } = useRouteStore();

  const bottomSheetRef = useRef(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const doFetch = useCallback(() => { fetchRoutes(); }, [fetchRoutes]);
  useEffect(() => { doFetch(); }, [timeMode]);

  const handleSeeWhy = (route) => {
    setSelectedRoute(route);
    setSheetOpen(true);
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleNavigate = (route) => {
    setSelectedRoute(route);
    navigation.navigate('Navigation');
  };

  const sorted = [...routes].sort((a) => (a.isRecommended ? -1 : 1));

  return (
    <GestureHandlerRootView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* SafeAreaView from react-native-safe-area-context fills correctly on Android */}
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
            <Text style={s.subtitle}>Fastest vs Safest</Text>
          </View>

          <DayNightToggle timeMode={timeMode} onToggle={setTimeMode} />
        </View>

        {/* ── Route list ── */}
        {isLoading ? (
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
          >
            <View testID="skeleton-card"><SkeletonCard /></View>
            <View testID="skeleton-card"><SkeletonCard /></View>
          </ScrollView>
        ) : (
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
                />
              </View>
            )}
            ListFooterComponent={
              sheetOpen ? (
                <TouchableOpacity
                  style={s.timeImpactBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('RouteComparison')}
                >
                  <Text style={s.timeImpactText}>Check Time Impact →</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </SafeAreaView>

      {/* ── Bottom Sheet ── */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['55%', '88%']}
        index={-1}
        enablePanDownToClose
        onClose={() => setSheetOpen(false)}
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
  timeImpactBtn: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  timeImpactText: {
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
