/**
 * NavigationScreen — Phase 4 (P1)
 *
 * Shows a Leaflet/OpenStreetMap map with:
 *  - Hardcoded route polyline (green = safe route)
 *  - Animated dot stepping along the route every 800ms
 *  - Safety indicator bar at the top
 *  - Zone alert popup after 5 seconds
 *  - Floating SOS button
 *
 * No GPS. No API key. Always works.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import SOSButton from '../components/SOSButton';
import ShakeSOSAlert from '../components/ShakeSOSAlert';
import { useShakeToSOS } from '../hooks/useShakeToSOS';
import { colors, getRiskColor } from '../config/colors';
import { useRouteStore } from '../stores/useRouteStore';
import { call112 } from '../services/sendSOS';

// ---------------------------------------------------------------------------
// Demo fallback coordinates (used only when no dynamic route is available)
// ---------------------------------------------------------------------------
const DEMO_COORDS = [
  [28.6315, 77.2167],
  [28.6280, 77.2210],
  [28.6230, 77.2270],
  [28.6170, 77.2330],
  [28.6090, 77.2380],
  [28.5990, 77.2400],
  [28.5700, 77.2410],
];

// ---------------------------------------------------------------------------
// Leaflet HTML — self-contained, no external dependencies beyond CDN tiles
// ---------------------------------------------------------------------------
function buildLeafletHTML(coords, dotIndex) {
  const coordsJson = JSON.stringify(coords);
  const dot = coords[dotIndex];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var coords = ${coordsJson};
    var map = L.map('map', { zoomControl: false, attributionControl: false });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(map);

    // Draw route polyline in green
    var polyline = L.polyline(coords, { color: '#22C55E', weight: 5, opacity: 0.85 }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    // Start marker
    L.circleMarker(coords[0], {
      radius: 8, fillColor: '#6366F1', color: '#fff',
      weight: 2, fillOpacity: 1
    }).addTo(map).bindPopup('Start').openPopup();

    // End marker
    L.circleMarker(coords[coords.length - 1], {
      radius: 8, fillColor: '#EF4444', color: '#fff',
      weight: 2, fillOpacity: 1
    }).addTo(map);

    // Animated dot
    var dotIcon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;background:#6366F1;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    var dot = L.marker([${dot[0]}, ${dot[1]}], { icon: dotIcon }).addTo(map);

    // Listen for dot position updates from React Native
    document.addEventListener('message', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'UPDATE_DOT') {
          dot.setLatLng([data.lat, data.lng]);
        }
      } catch(_) {}
    });
    window.addEventListener('message', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'UPDATE_DOT') {
          dot.setLatLng([data.lat, data.lng]);
        }
      } catch(_) {}
    });
  </script>
</body>
</html>
  `;
}

// ---------------------------------------------------------------------------
// NavigationScreen
// ---------------------------------------------------------------------------
export default function NavigationScreen({ navigation }) {
  const { selectedRoute, routeCoords: storeCoords, source, destination } = useRouteStore();

  // Use dynamic coords from store if available, otherwise fall back to demo
  const ROUTE_COORDS = (storeCoords && storeCoords.length >= 2) ? storeCoords : DEMO_COORDS;
  const [dotIndex, setDotIndex]           = useState(0);
  const [alertVisible, setAlertVisible]   = useState(false);
  const [rerouteVisible, setRerouteVisible] = useState(false);
  const [policeVisible, setPoliceVisible] = useState(false);
  const webViewRef = useRef(null);

  const currentZone = selectedRoute ? {
    name: selectedRoute.label,
    safetyScore: selectedRoute.safetyScore,
    riskLevel: selectedRoute.riskLevel
  } : {
    name: 'Unknown',
    safetyScore: 50,
    riskLevel: 'MODERATE'
  };
  const zoneColor   = getRiskColor(currentZone.riskLevel);

  const { shakeDetected, countdown, cancelShakeSOS } = useShakeToSOS(() => {
    navigation.navigate('SOS');
  });

  // Step dot along route every 800ms and update WebView
  useEffect(() => {
    const interval = setInterval(() => {
      setDotIndex(prev => {
        const next = Math.min(prev + 1, ROUTE_COORDS.length - 1);
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [ROUTE_COORDS.length]);

  // Send updated dot position to WebView whenever dotIndex changes
  useEffect(() => {
    const [lat, lng] = ROUTE_COORDS[dotIndex] ?? ROUTE_COORDS[0];
    const js = `
      (function() {
        var e = new MessageEvent('message', {
          data: JSON.stringify({ type: 'UPDATE_DOT', lat: ${lat}, lng: ${lng} })
        });
        document.dispatchEvent(e);
        window.dispatchEvent(e);
      })();
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  }, [dotIndex]);

  // Zone alert fires after 5 seconds
  useEffect(() => {
    const t1 = setTimeout(() => setAlertVisible(true), 5000);
    // Adaptive rerouting alert fires after 10 seconds (simulates unsafe zone detection)
    const t2 = setTimeout(() => setRerouteVisible(true), 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const routeLabel = selectedRoute
    ? `${selectedRoute.emoji} ${selectedRoute.label}`
    : '✅ Safest Route';

  const safetyScore = selectedRoute?.safetyScore ?? 81;

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

      {/* Leaflet map — uses dynamic route coords */}
      <WebView
        ref={webViewRef}
        style={styles.map}
        originWhitelist={['*']}
        source={{ html: buildLeafletHTML(ROUTE_COORDS, 0) }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
      />

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
        onPress={() => {
          // Re-inject fitBounds to recenter map on route
          webViewRef.current?.injectJavaScript(`
            (function() { map.fitBounds(polyline.getBounds(), { padding: [40, 40] }); })(); true;
          `);
        }}
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
              >
                <Text style={styles.rerouteDismissText}>Stay on route</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rerouteAccept}
                onPress={() => setRerouteVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.rerouteAcceptText}>Rerouting →</Text>
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
            {[
              { icon: '🏢', label: 'Station', value: 'Connaught Place PCR' },
              { icon: '📍', label: 'Address', value: 'Baba Kharak Singh Marg, CP' },
              { icon: '📞', label: 'Contact', value: '011-23412345' },
              { icon: '🕐', label: 'ETA',     value: '~4 minutes' },
              { icon: '📏', label: 'Distance', value: '0.8 km away' },
            ].map((row, i) => (
              <View key={i} style={[styles.policeModalRow, i > 0 && styles.policeModalRowBorder]}>
                <Text style={styles.policeModalIcon}>{row.icon}</Text>
                <Text style={styles.policeModalLabel}>{row.label}</Text>
                <Text style={styles.policeModalValue}>{row.value}</Text>
              </View>
            ))}
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
    bottom: 110,
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
