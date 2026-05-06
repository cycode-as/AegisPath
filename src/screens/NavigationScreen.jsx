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
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import SOSButton from '../components/SOSButton';
import { colors, getRiskColor } from '../config/colors';
import { useRouteStore } from '../stores/useRouteStore';

// ---------------------------------------------------------------------------
// Hardcoded route coordinates: Connaught Place → Lajpat Nagar Metro
// ---------------------------------------------------------------------------
const ROUTE_COORDS = [
  [28.6315, 77.2167], // Connaught Place
  [28.6280, 77.2210], // Janpath
  [28.6230, 77.2270], // Mandi House
  [28.6170, 77.2330], // ITO
  [28.6090, 77.2380], // Pragati Maidan
  [28.5990, 77.2400], // Lajpat Nagar
  [28.5700, 77.2410], // Lajpat Nagar Metro
];

// Zone segments along the route (index of coord where zone changes)
const ZONE_SEGMENTS = [
  { upToIndex: 2, name: 'CP Market',        safetyScore: 88, riskLevel: 'LOW'      },
  { upToIndex: 4, name: 'Mandi House Area', safetyScore: 72, riskLevel: 'MODERATE' },
  { upToIndex: 6, name: 'Lajpat Nagar',     safetyScore: 85, riskLevel: 'LOW'      },
];

function getZoneForIndex(index) {
  for (const seg of ZONE_SEGMENTS) {
    if (index <= seg.upToIndex) return seg;
  }
  return ZONE_SEGMENTS[ZONE_SEGMENTS.length - 1];
}

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
  const { selectedRoute } = useRouteStore();
  const [dotIndex, setDotIndex]       = useState(0);
  const [alertVisible, setAlertVisible] = useState(false);
  const webViewRef = useRef(null);

  const currentZone = getZoneForIndex(dotIndex);
  const zoneColor   = getRiskColor(currentZone.riskLevel);

  // Step dot along route every 800ms
  useEffect(() => {
    const interval = setInterval(() => {
      setDotIndex(i => {
        const next = Math.min(i + 1, ROUTE_COORDS.length - 1);
        // Send updated position to WebView
        webViewRef.current?.injectJavaScript(`
          (function() {
            var e = new MessageEvent('message', {
              data: JSON.stringify({ type: 'UPDATE_DOT', lat: ${JSON.stringify(ROUTE_COORDS)}[${0}][0], lng: ${JSON.stringify(ROUTE_COORDS)}[${0}][1] })
            });
            document.dispatchEvent(e);
          })();
        `);
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Send dot position to WebView whenever dotIndex changes
  useEffect(() => {
    const [lat, lng] = ROUTE_COORDS[dotIndex];
    webViewRef.current?.injectJavaScript(`
      (function() {
        var e = new MessageEvent('message', {
          data: JSON.stringify({ type: 'UPDATE_DOT', lat: ${lat}, lng: ${lng} })
        });
        document.dispatchEvent(e);
        window.dispatchEvent(e);
      })();
    `);
  }, [dotIndex]);

  // Zone alert fires after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setAlertVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const routeLabel = selectedRoute
    ? `${selectedRoute.emoji} ${selectedRoute.label}`
    : '✅ Safest Route';

  const safetyScore = selectedRoute?.safetyScore ?? 81;

  return (
    <View style={styles.container}>

      {/* Safety indicator bar */}
      <SafeAreaView style={[styles.safetyBar, { backgroundColor: zoneColor }]}>
        <Text style={styles.safetyBarText}>
          📍 {currentZone.name}  ·  Safety: {currentZone.safetyScore}
        </Text>
      </SafeAreaView>

      {/* Leaflet map */}
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
    alignItems: 'center',
  },
  safetyBarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  map: {
    flex: 1,
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
});
