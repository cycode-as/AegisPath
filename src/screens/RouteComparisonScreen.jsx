import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import RouteCard      from '../components/RouteCard';
import DayNightToggle from '../components/DayNightToggle';
import SkeletonCard   from '../components/SkeletonCard';
import FactorBar      from '../components/FactorBar';
import SOSButton      from '../components/SOSButton';
import ConfidencePill from '../components/ConfidencePill';
import OfflineBanner  from '../components/OfflineBanner';
import { useRouteStore } from '../stores/useRouteStore';
import { colors, getRiskColor } from '../config/colors';

// ---------------------------------------------------------------------------
// Factor order for the detail sheet
// ---------------------------------------------------------------------------
const FACTORS = [
  { label: 'Crime', key: 'crime' },
  { label: 'Time',  key: 'time'  },
  { label: 'Crowd', key: 'crowd' },
  { label: 'Infra', key: 'infra' },
];

// ---------------------------------------------------------------------------
// RouteDetailSheet — inline component that reads selectedRoute from the store
// ---------------------------------------------------------------------------
function RouteDetailSheet() {
  const selectedRoute = useRouteStore((s) => s.selectedRoute);

  // One shared value per factor bar for the stagger opacity animation.
  const opacities = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];

  // Animated styles derived from the shared values.
  const animStyles = [
    useAnimatedStyle(() => ({ opacity: opacities[0].value })),
    useAnimatedStyle(() => ({ opacity: opacities[1].value })),
    useAnimatedStyle(() => ({ opacity: opacities[2].value })),
    useAnimatedStyle(() => ({ opacity: opacities[3].value })),
  ];

  // Replay stagger animation whenever selectedRoute changes.
  useEffect(() => {
    if (!selectedRoute) return;
    opacities.forEach((sv, i) => {
      sv.value = 0;
      sv.value = withDelay(i * 100, withTiming(1, { duration: 400 }));
    });
  }, [selectedRoute]);

  if (!selectedRoute) return null;

  const { label, emoji, safetyScore, riskLevel, badges, narrative, factors } = selectedRoute;

  return (
    <ScrollView contentContainerStyle={sheetStyles.content}>
      {/* Route label */}
      <Text style={sheetStyles.routeLabel}>
        {emoji} {label.toUpperCase()}
      </Text>

      {/* Safety score */}
      <Text style={[sheetStyles.safetyScore, { color: getRiskColor(riskLevel) }]}>
        {safetyScore}
      </Text>

      {/* Staggered factor bars */}
      {FACTORS.map(({ label: factorLabel, key }, index) => (
        <Animated.View key={key} style={animStyles[index]}>
          <FactorBar label={factorLabel} value={factors[key]} />
        </Animated.View>
      ))}

      {/* Confidence badges */}
      <View style={sheetStyles.badgeRow}>
        {badges.map((b, i) => (
          <ConfidencePill
            key={i}
            testID="confidence-pill"
            icon={b.icon}
            label={b.label}
            type={b.type}
          />
        ))}
      </View>

      {/* Full narrative — no numberOfLines cap */}
      <Text style={sheetStyles.narrative}>{narrative}</Text>
    </ScrollView>
  );
}

const sheetStyles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  safetyScore: {
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 60,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 8,
  },
  narrative: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
});

// ---------------------------------------------------------------------------
// RouteComparisonScreen
// ---------------------------------------------------------------------------
export default function RouteComparisonScreen({ navigation }) {
  const {
    routes, isLoading, timeMode,
    fetchRoutes, setTimeMode, setSelectedRoute,
  } = useRouteStore();

  const bottomSheetRef = useRef(null);

  useEffect(() => {
    fetchRoutes();
  }, [timeMode]);

  const handleSeeWhy = (route) => {
    setSelectedRoute(route);
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleNavigate = (route) => {
    setSelectedRoute(route);
    navigation.navigate('Navigation');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OfflineBanner />
      <SafeAreaView style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Route Options</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => navigation.navigate('IncidentReport')}
            >
              <Text style={styles.reportBtnText}>⚠️ Report</Text>
            </TouchableOpacity>
            <DayNightToggle timeMode={timeMode} onToggle={setTimeMode} />
          </View>
        </View>

        {/* Route cards or skeleton */}
        {isLoading ? (
          <View style={styles.list}>
            <View testID="skeleton-card"><SkeletonCard /></View>
            <View testID="skeleton-card"><SkeletonCard /></View>
          </View>
        ) : (
          <FlatList
            data={[...routes].sort((a) => a.isRecommended ? -1 : 1)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View testID="route-card">
                <RouteCard
                  route={item}
                  onSeeWhy={handleSeeWhy}
                  onNavigate={handleNavigate}
                />
              </View>
            )}
          />
        )}

      </SafeAreaView>

      {/* Bottom sheet — outside SafeAreaView so it overlays the full screen */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['55%', '88%']}
        index={-1}
        enablePanDownToClose
        handleComponent={() => <View style={styles.handle} />}
      >
        <BottomSheetView>
          <RouteDetailSheet />
        </BottomSheetView>
      </BottomSheet>

      {/* Floating SOS button */}
      <SOSButton
        onLongPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          navigation.navigate('SOS');
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportBtn: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  list: {
    padding: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 8,
  },
});
