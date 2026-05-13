/**
 * routingEngine.js — Dynamic route fetching via OSRM public API.
 *
 * Fetches real routes with alternatives, decodes geometry,
 * and enriches each route with safety confidence scores from
 * the routeScoringEngine.
 */

import { scoreRoute, buildZoneFromScore } from './routeScoringEngine';
import narratives from '../../assets/data/narratives.json';
import badges from '../../assets/data/badges.json';

// OSRM profiles: 'driving', 'walking', 'cycling'
const PROFILE_MAP = {
  walking: 'foot',
  driving: 'car',
  cab: 'car',
};

/**
 * Fetch routes from public OSRM API.
 * @param {number} startLat
 * @param {number} startLon
 * @param {number} endLat
 * @param {number} endLon
 * @param {string} travelMode - 'walking' | 'driving' | 'cab'
 */
export const fetchOSRMData = async (startLat, startLon, endLat, endLon, travelMode = 'driving') => {
  const profile = PROFILE_MAP[travelMode] || 'car';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${startLon},${startLat};${endLon},${endLat}?alternatives=true&geometries=geojson&overview=full`;
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AegisPath/1.0' },
  });
  
  if (!res.ok) throw new Error(`Routing API error (${res.status})`);
  return res.json();
};

/**
 * Enrich a single OSRM route with safety analysis.
 */
const enrichRoute = (routeData, index, timeMode) => {
  const timeHour = timeMode === 'night' ? 21 : 14;
  const isAlternative = index > 0;
  const distanceMeters = routeData.distance;
  const durationSeconds = routeData.duration;
  const duration = Math.round(durationSeconds / 60);

  // Map OSRM [lon, lat] → [lat, lon] for react-native-maps
  const coordinates = routeData.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

  // Run through safety confidence engine
  const analysis = scoreRoute({
    distanceMeters,
    durationSeconds,
    coordsCount: coordinates.length,
    hour: timeHour,
    isAlternative,
  });

  // Build zone for Time Impact screen compatibility
  const zone = buildZoneFromScore(analysis.factors);

  // Select narratives and badges
  const routeKey = isAlternative ? 'routeB' : 'routeA';
  const isRecommended = !isAlternative;

  return {
    id: `route_${index}`,
    label: isAlternative ? 'Alternative' : 'Recommended',
    emoji: isAlternative ? '📍' : '✅',
    duration: `${duration} min`,
    distance: `${(distanceMeters / 1000).toFixed(1)} km`,
    isRecommended,
    timeHour,
    safetyScore: analysis.safetyScore,
    riskScore: analysis.riskScore,
    riskLevel: analysis.riskLevel,
    roadType: analysis.roadType,
    factors: {
      crime: Math.round((100 - analysis.factors.crowd) * 0.4),
      time:  Math.round((100 - analysis.factors.time) * 0.25),
      crowd: Math.round((100 - analysis.factors.crowd) * 0.2),
      infra: Math.round((100 - analysis.factors.emergency) * 0.15),
    },
    confidenceFactors: analysis.factors,
    zone,
    routeCoords: coordinates,
    narrative: narratives[routeKey]?.[timeMode] || 'Route analysis based on environmental factors.',
    badges: badges[routeKey]?.[timeMode] || [],
  };
};

/**
 * Fetch and enrich dynamic routes.
 * @param {{ lat: number, lon: number }} start
 * @param {{ lat: number, lon: number }} end
 * @param {string} timeMode - 'day' | 'night'
 * @param {string} travelMode - 'walking' | 'driving' | 'cab'
 */
export const getDynamicRoutes = async (start, end, timeMode = 'night', travelMode = 'walking') => {
  if (!start?.lat || !start?.lon || !end?.lat || !end?.lon) {
    throw new Error('Source and destination coordinates are required');
  }

  const data = await fetchOSRMData(start.lat, start.lon, end.lat, end.lon, travelMode);

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No routes found between these locations');
  }

  return data.routes.map((r, i) => enrichRoute(r, i, timeMode));
};
