/**
 * NavigationScreen — Native Map Navigation
 *
 * Uses react-native-maps for native rendering with:
 *  - Dynamic route polyline from OSRM
 *  - Animated position marker stepping along route
 *  - Safety indicator bar
 *  - Zone alerts, reroute alerts, police modal
 *  - Floating SOS + recenter buttons
 *  - Shake-to-SOS
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import SOSButton from '../components/SOSButton';
import ShakeSOSAlert from '../components/ShakeSOSAlert';
import { useShakeToSOS } from '../hooks/useShakeToSOS';
import { colors, getRiskColor } from '../config/colors';
import { useRouteStore } from '../stores/useRouteStore';
import { call112 } from '../services/sendSOS';
import { getDynamicRoutes } from '../services/routingEngine';
import { getNearestPoliceStation } from '../services/policeStationService';
import * as Location from 'expo-location';

// ─── Polyline color by risk level ────────────────────────────────────────────
function getPolylineColor(riskLevel) {
  if (riskLevel === 'LOW') return '#22C55E';
  if (riskLevel === 'MODERATE') return '#F59E0B';
  return '#EF4444';
}

// ─── Convert [lat, lon] array to region ──────────────────────────────────────
function getRegionForCoords(coords) {
  if (!coords || coords.length === 0) {
    return { latitude: 28.6139, longitude: 77.2090, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }
  let minLat = coords[0][0], maxLat = coords[0][0];
  let minLon = coords[0][1], maxLon = coords[0][1];
  coords.forEach(([lat, lon]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  });
  const midLat = (minLat + maxLat) / 2;
  const midLon = (minLon + maxLon) / 2;
  const deltaLat = (maxLat - minLat) * 1.4 + 0.005;
  const deltaLon = (maxLon - minLon) * 1.4 + 0.005;
  return { latitude: midLat, longitude: midLon, latitudeDelta: deltaLat, longitudeDelta: deltaLon };
}

// ─── NavigationScreen ────────────────────────────────────────────────────────
export default function NavigationScreen({ navigation }) {
  const {
    selectedRoute, routeCoords: storeCoords,
    source, destination, destCoords,
    timeMode, travelMode, setRouteCoords,
  } = useRouteStore();

  // ── State — declared BEFORE any useMemo that references them ──
  const [dotIndex, setDotIndex]             = useState(0);
  const [alertVisible, setAlertVisible]     = useState(false);
  const [rerouteVisible, setRerouteVisible] = useState(false);
  const [policeVisible, setPoliceVisible]   = useState(false);
  const [isRerouting, setIsRerouting]       = useState(false);
  const [rerouteCoords, setRerouteCoords]   = useState(null);

  // Police station — fetched once on mount from GPS + Overpass API
  const [policeStation, setPoliceStation]   = useState(null);
  const [policeLoading, setPoliceLoading]   = useState(false);

  // Refs
  const mapRef        = useRef(null);
  const isMounted     = useRef(true);   // memory-leak guard
  const rerouteInFlight = useRef(false); // race-condition guard
  const intervalRef   = useRef(null);   // dot interval ref for restart after reroute

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── Fetch nearest police station once on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPoliceLoading(true);
      try {
        // Try to get GPS; use route start as fallback
        let lat, lon;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            lat = loc.coords.latitude;
            lon = loc.coords.longitude;
          }
        } catch (_) {}

        // Fallback: use first route coordinate
        if ((lat == null || lon == null) && ROUTE_COORDS?.length > 0) {
          [lat, lon] = ROUTE_COORDS[0];
        }

        if (lat == null || lon == null) return;

        const station = await getNearestPoliceStation(lat, lon);
        if (!cancelled && isMounted.current) {
          setPoliceStation(station);
        }
      } catch (_) {
        // Silent — never crash navigation
      } finally {
        if (!cancelled && isMounted.current) setPoliceLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // run once on mount — ROUTE_COORDS may not be set yet, handled by fallback

  // ── Active route coords — rerouteCoords takes priority ──
  const ROUTE_COORDS = useMemo(() => {
    if (rerouteCoords && rerouteCoords.length >= 2) return rerouteCoords;
    if (storeCoords && storeCoords.length >= 2) return storeCoords;
    return null;
  }, [rerouteCoords, storeCoords]);

  const currentZone = selectedRoute ? {
    name: selectedRoute.label,
    safetyScore: selectedRoute.safetyScore,
    riskLevel: selectedRoute.riskLevel,
  } : {
    name: 'Route',
    safetyScore: 50,
    riskLevel: 'MODERATE',
  };
  const zoneColor = getRiskColor(currentZone.riskLevel);
  const polylineColor = getPolylineColor(currentZone.riskLevel);

  const { shakeDetected, countdown, cancelShakeSOS } = useShakeToSOS(() => {
    navigation.navigate('SOS');
  });

  // ── Polyline data for MapView ──
  const polylineCoords = useMemo(() => {
    if (!ROUTE_COORDS) return [];
    return ROUTE_COORDS.map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
  }, [ROUTE_COORDS]);

  // ── Initial region ──
  const initialRegion = useMemo(() => getRegionForCoords(ROUTE_COORDS), [ROUTE_COORDS]);

  // ── Step dot along route every 800ms ──
  // Uses intervalRef so it can be cleanly restarted after rerouting
  useEffect(() => {
    if (!ROUTE_COORDS || ROUTE_COORDS.length === 0) return;
    const stepSize = Math.max(1, Math.floor(ROUTE_COORDS.length / 60));

    // Clear any existing interval before starting a new one
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDotIndex(prev => {
        const next = prev + stepSize;
        return next >= ROUTE_COORDS.length ? ROUTE_COORDS.length - 1 : next;
      });
    }, 800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [ROUTE_COORDS]); // restarts whenever ROUTE_COORDS changes (i.e. after reroute)

  // ── Camera follows the dot ──
  useEffect(() => {
    if (!ROUTE_COORDS || ROUTE_COORDS.length === 0) return;
    const [lat, lon] = ROUTE_COORDS[dotIndex] || ROUTE_COORDS[0];
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }, 600);
  }, [dotIndex]);

  // ── Zone alert after 5s, reroute after 10s ──
  useEffect(() => {
    const t1 = setTimeout(() => setAlertVisible(true), 5000);
    const t2 = setTimeout(() => setRerouteVisible(true), 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ── Recenter to full route ──
  const handleRecenter = () => {
    if (!ROUTE_COORDS || ROUTE_COORDS.length === 0) return;
    const region = getRegionForCoords(ROUTE_COORDS);
    mapRef.current?.animateToRegion(region, 500);
  };

  // ── Adaptive rerouting — fetch new route from current dot position ──
  const handleReroute = useCallback(async () => {
    // Prevent concurrent calls
    if (rerouteInFlight.current) return;
    rerouteInFlight.current = true;

    if (isMounted.current) setIsRerouting(true);

    try {
      // Read current coords and dotIndex via functional updater to avoid stale closure
      let currentDotIndex = 0;
      setDotIndex(prev => { currentDotIndex = prev; return prev; });

      // Small yield to let the state read settle
      await new Promise(r => setTimeout(r, 0));

      const activeCoords = rerouteCoords?.length >= 2 ? rerouteCoords
        : storeCoords?.length >= 2 ? storeCoords : null;

      const currentPos = activeCoords?.[currentDotIndex] ?? activeCoords?.[0];

      if (!currentPos || !destCoords) {
        if (isMounted.current) { setRerouteVisible(false); setIsRerouting(false); }
        rerouteInFlight.current = false;
        return;
      }

      const newStart = { lat: currentPos[0], lon: currentPos[1] };
      const newRoutes = await getDynamicRoutes(newStart, destCoords, timeMode, travelMode);

      // Component may have unmounted during the API call
      if (!isMounted.current) { rerouteInFlight.current = false; return; }

      if (!newRoutes || newRoutes.length === 0) {
        setRerouteVisible(false);
        setIsRerouting(false);
        rerouteInFlight.current = false;
        return;
      }

      // Pick the safest route
      const safest = newRoutes.reduce((best, r) =>
        r.safetyScore > best.safetyScore ? r : best, newRoutes[0]);

      const newCoords = safest.routeCoords;

      // Reset dot to 0 BEFORE updating coords so the interval restart
      // (triggered by ROUTE_COORDS change) starts from the correct position
      setDotIndex(0);
      setRerouteCoords(newCoords);
      setRouteCoords(newCoords); // keep store in sync

      // Delay camera animation slightly so the polyline re-renders first,
      // avoiding a visual conflict with the dot-follow camera animation
      setTimeout(() => {
        if (!isMounted.current) return;
        const region = getRegionForCoords(newCoords);
        mapRef.current?.animateToRegion(region, 700);
      }, 100);

    } catch (_) {
      // Silent fallback — never crash during navigation
      if (isMounted.current) { setRerouteVisible(false); setIsRerouting(false); }
    } finally {
      rerouteInFlight.current = false;
      if (isMounted.current) { setIsRerouting(false); setRerouteVisible(false); }
    }
  }, [rerouteCoords, storeCoords, destCoords, timeMode, travelMode]);

  const routeLabel = selectedRoute
    ? `${selectedRoute.emoji} ${selectedRoute.label}`
    : '✅ Route';

  const safetyScore = selectedRoute?.safetyScore ?? 50;

  // Current dot position
  const dotPosition = ROUTE_COORDS && ROUTE_COORDS[dotIndex]
    ? { latitude: ROUTE_COORDS[dotIndex][0], longitude: ROUTE_COORDS[dotIndex][1] }
    : null;

  // Start and end markers
  const startCoord = ROUTE_COORDS && ROUTE_COORDS.length > 0
    ? { latitude: ROUTE_COORDS[0][0], longitude: ROUTE_COORDS[0][1] }
    : null;
  const endCoord = ROUTE_COORDS && ROUTE_COORDS.length > 1
    ? { latitude: ROUTE_COORDS[ROUTE_COORDS.length - 1][0], longitude: ROUTE_COORDS[ROUTE_COORDS.length - 1][1] }
    : null;

  if (!ROUTE_COORDS) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={[styles.safetyBar, { backgroundColor: colors.brand }]}>
          <View style={styles.safetyBarInner}>
            <Text style={styles.safetyBarText}>No route data available</Text>
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#64748B' }}>Please select a route first.</Text>
          <TouchableOpacity
            style={{ marginTop: 16, padding: 14, backgroundColor: colors.brand, borderRadius: 12 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Safety indicator bar */}
      <SafeAreaView style={[styles.safetyBar, { backgroundColor: zoneColor }]}>
        <View style={styles.safetyBarInner}>
          <View style={styles.pulsingDot}>
            <View style={[styles.pulsingDotCore, { backgroundColor: '#fff' }]} />
          </View>
          <Text style={styles.safetyBarText}>
            {currentZone.name}  ·  Safety {currentZone.safetyScore}/100
          </Text>
          <Text style={styles.safetyBarRisk}>{currentZone.riskLevel}</Text>
        </View>
      </SafeAreaView>

      {/* Native map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapType="standard"
      >
        {/* Route polyline */}
        {polylineCoords.length > 0 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={polylineColor}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Start marker */}
        {startCoord && (
          <Marker coordinate={startCoord} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerStart}>
              <Text style={styles.markerEmoji}>📍</Text>
            </View>
          </Marker>
        )}

        {/* End marker */}
        {endCoord && (
          <Marker coordinate={endCoord} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerEnd}>
              <Text style={styles.markerEmoji}>🚩</Text>
            </View>
          </Marker>
        )}

        {/* Animated position dot */}
        {dotPosition && (
          <Marker coordinate={dotPosition} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.animDot}>
              <View style={styles.animDotInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Floating SOS button */}
      <SOSButton
        onLongPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          navigation.navigate('SOS');
        }}
      />

      {/* Map recenter button */}
      <TouchableOpacity
        style={styles.recenterBtn}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <Text style={styles.recenterIcon}>⊕</Text>
      </TouchableOpacity>

      {/* Police assistance floating button */}
      <TouchableOpacity
        style={styles.policeBtn}
        onPress={() => setPoliceVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.policeBtnIcon}>🚔</Text>
      </TouchableOpacity>

      {/* Route info card at bottom */}
      <View style={styles.routeInfoCard}>
        <View style={styles.routeInfoRow}>
          <Text style={styles.routeInfoLabel}>{routeLabel}</Text>
          <View style={[styles.routeInfoBadge, { backgroundColor: zoneColor }]}>
            <Text style={styles.routeInfoBadgeText}>{safetyScore}</Text>
          </View>
        </View>
        {source && destination && (
          <Text style={styles.routeInfoSub} numberOfLines={1}>
            {source} → {destination}
          </Text>
        )}
        {selectedRoute && (
          <Text style={styles.routeInfoMeta}>
            {selectedRoute.duration}  ·  {selectedRoute.distance}
          </Text>
        )}
      </View>

      {/* Zone alert modal */}
      <Modal
        visible={alertVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.alertBackdrop}>
          <View style={styles.alertBox}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertTitle}>Caution</Text>
            <Text style={styles.alertBody}>
              Entering low-visibility stretch.{'\n'}Stay aware of your surroundings.
            </Text>
            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.alertBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shake-to-SOS alert */}
      <ShakeSOSAlert
        visible={shakeDetected}
        countdown={countdown}
        onCancel={cancelShakeSOS}
      />

      {/* Adaptive rerouting alert */}
      <Modal
        visible={rerouteVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRerouteVisible(false)}
      >
        <View style={styles.alertBackdrop}>
          <View style={[styles.alertBox, styles.rerouteBox]}>
            <View style={styles.rerouteHeader}>
              <View style={styles.rerouteDot} />
              <Text style={styles.rerouteLabel}>ADAPTIVE SAFETY</Text>
            </View>
            <Text style={styles.rerouteTitle}>Safer route detected</Text>
            <Text style={styles.rerouteBody}>
              Low crowd density ahead on current path.{'\n'}
              A safer alternative has been identified.
            </Text>
            <View style={styles.rerouteBtnRow}>
              <TouchableOpacity
                style={styles.rerouteDismiss}
                onPress={() => setRerouteVisible(false)}
                activeOpacity={0.7}
                disabled={isRerouting}
              >
                <Text style={styles.rerouteDismissText}>Stay on route</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rerouteAccept, isRerouting && { opacity: 0.7 }]}
                onPress={handleReroute}
                activeOpacity={0.85}
                disabled={isRerouting}
              >
                {isRerouting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.rerouteAcceptText}>Rerouting →</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Police assistance modal */}
      <Modal
        visible={policeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPoliceVisible(false)}
      >
        <View style={styles.alertBackdrop}>
          <View style={styles.policeModal}>
            <View style={styles.policeModalHeader}>
              <Text style={styles.policeModalTitle}>🚔 Nearest Police Support</Text>
              <TouchableOpacity onPress={() => setPoliceVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.policeModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {policeLoading ? (
              <View style={styles.policeLoadingWrap}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.policeLoadingText}>Finding nearest station…</Text>
              </View>
            ) : (
              <>
                {[
                  {
                    icon: '🏢',
                    label: 'Station',
                    value: policeStation?.name ?? 'Nearest PCR Unit',
                  },
                  {
                    icon: '📏',
                    label: 'Distance',
                    value: policeStation?.distance ?? 'Calculating…',
                  },
                  {
                    icon: '🕐',
                    label: 'ETA',
                    value: policeStation?.eta ?? '~4 min',
                  },
                  ...(policeStation?.phone
                    ? [{ icon: '📞', label: 'Phone', value: policeStation.phone }]
                    : [{ icon: '📞', label: 'Emergency', value: '112' }]),
                ].map((row, i) => (
                  <View key={i} style={[styles.policeModalRow, i > 0 && styles.policeModalRowBorder]}>
                    <Text style={styles.policeModalIcon}>{row.icon}</Text>
                    <Text style={styles.policeModalLabel}>{row.label}</Text>
                    <Text style={styles.policeModalValue} numberOfLines={2}>{row.value}</Text>
                  </View>
                ))}
              </>
            )}

            <TouchableOpacity
              style={styles.policeCallBtn}
              onPress={() => { setPoliceVisible(false); call112(); }}
              activeOpacity={0.85}
            >
              <Text style={styles.policeCallBtnText}>📞 Call 112 — Emergency</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safetyBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  safetyBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  pulsingDotCore: { width: 6, height: 6, borderRadius: 3 },
  safetyBarText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  safetyBarRisk: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  map: {
    flex: 1,
  },

  /* Markers */
  markerStart: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  markerEnd: {
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  markerEmoji: { fontSize: 16 },

  /* Animated dot */
  animDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6366F1',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },

  /* Route info card */
  routeInfoCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  routeInfoLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  routeInfoBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  routeInfoBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  routeInfoSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  routeInfoMeta: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* Recenter button */
  recenterBtn: {
    position: 'absolute',
    bottom: 190,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  recenterIcon: { fontSize: 22, color: colors.brand },

  /* Police floating button */
  policeBtn: {
    position: 'absolute',
    bottom: 250,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  policeBtnIcon: { fontSize: 20 },

  /* Police modal */
  policeModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  policeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  policeModalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  policeModalClose: { fontSize: 18, color: colors.textSecondary },
  policeModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  policeModalRowBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  policeModalIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  policeModalLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', width: 64 },
  policeModalValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  policeCallBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  policeCallBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  policeLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  policeLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Zone alert
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  alertBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  alertIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  alertBody: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  alertBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  alertBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  /* Reroute modal */
  rerouteBox: {
    borderTopWidth: 3,
    borderTopColor: colors.brand,
  },
  rerouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  rerouteDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.brand,
  },
  rerouteLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brand,
    letterSpacing: 1,
  },
  rerouteTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  rerouteBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  rerouteBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rerouteDismiss: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  rerouteDismissText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rerouteAccept: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
  },
  rerouteAcceptText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
