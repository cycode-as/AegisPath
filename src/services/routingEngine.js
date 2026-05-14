/**
 * routingEngine.js — Dynamic route fetching via OSRM public API.
 *
 * Fetches real routes with alternatives, decodes geometry,
 * and enriches each route with contextual safety confidence scores
 * from routeScoringService (OSM-backed) with routeScoringEngine as fallback.
 */

import { scoreRoute, buildZoneFromScore } from './routeScoringEngine';
import { scoreRouteContextual, buildZoneFromContextual } from './routeScoringService';
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
 * Compute the geometric divergence between two coordinate arrays.
 * Returns a score 0–1 where 1 = completely different geometry.
 * Uses midpoint sampling to avoid O(n²) comparison.
 */
function geometricDivergence(coordsA, coordsB) {
  if (!coordsA?.length || !coordsB?.length) return 0;

  // Sample up to 10 evenly-spaced points from each route
  const sample = (coords, n) => {
    const step = Math.max(1, Math.floor(coords.length / n));
    const pts = [];
    for (let i = 0; i < coords.length; i += step) pts.push(coords[i]);
    return pts;
  };

  const ptsA = sample(coordsA, 10);
  const ptsB = sample(coordsB, 10);

  // For each point in A, find the minimum distance to any point in B
  let totalDist = 0;
  for (const [latA, lonA] of ptsA) {
    let minDist = Infinity;
    for (const [latB, lonB] of ptsB) {
      const d = Math.sqrt((latA - latB) ** 2 + (lonA - lonB) ** 2);
      if (d < minDist) minDist = d;
    }
    totalDist += minDist;
  }

  // Normalise: ~0.01 degrees ≈ 1 km. Cap at 1.
  const avgDist = totalDist / ptsA.length;
  return Math.min(1, avgDist / 0.02);
}

/**
 * Enrich a single OSRM route with contextual safety confidence.
 * Uses OSM-backed scorer with synchronous fallback.
 */
const enrichRoute = async (routeData, index, timeMode) => {
  const timeHour = timeMode === 'night' ? 21 : 14;
  const isAlternative = index > 0;
  const distanceMeters = routeData.distance;
  const durationSeconds = routeData.duration;
  const duration = Math.round(durationSeconds / 60);

  // Map OSRM [lon, lat] → [lat, lon] for react-native-maps
  const coordinates = routeData.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

  // Try contextual OSM scoring first; fall back to heuristic scorer
  let analysis;
  let zone;
  try {
    const contextual = await scoreRouteContextual(coordinates, timeHour);
    analysis = {
      safetyScore: contextual.safetyScore,
      riskScore:   100 - contextual.safetyScore,
      riskLevel:   contextual.riskLevel,
      roadType:    'dynamic',
      factors:     contextual.factors,
      tags:        contextual.tags,
    };
    zone = buildZoneFromContextual(contextual.factors);
  } catch (_) {
    // Fallback to synchronous heuristic scorer
    const fallback = scoreRoute({
      distanceMeters,
      durationSeconds,
      coordsCount: coordinates.length,
      hour: timeHour,
      isAlternative,
    });
    analysis = {
      safetyScore: fallback.safetyScore,
      riskScore:   fallback.riskScore,
      riskLevel:   fallback.riskLevel,
      roadType:    fallback.roadType,
      factors:     fallback.factors,
      tags:        [],
    };
    zone = buildZoneFromScore(fallback.factors);
  }

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
    riskScore:   analysis.riskScore,
    riskLevel:   analysis.riskLevel,
    roadType:    analysis.roadType,
    factors: {
      crime: Math.round((100 - (analysis.factors.crowd ?? 50)) * 0.4),
      time:  Math.round((100 - (analysis.factors.time  ?? 50)) * 0.25),
      crowd: Math.round((100 - (analysis.factors.crowd ?? 50)) * 0.2),
      infra: Math.round((100 - (analysis.factors.emergency ?? 50)) * 0.15),
    },
    confidenceFactors: analysis.factors,
    confidenceTags:    analysis.tags ?? [],
    zone,
    routeCoords: coordinates,
    narrative: narratives[routeKey]?.[timeMode] || 'Route analysis based on environmental factors.',
    badges: badges[routeKey]?.[timeMode] || [],
  };
};

/**
 * Fetch and enrich dynamic routes.
 */
export const getDynamicRoutes = async (start, end, timeMode = 'night', travelMode = 'walking') => {
  if (!start?.lat || !start?.lon || !end?.lat || !end?.lon) {
    throw new Error('Source and destination coordinates are required');
  }

  const data = await fetchOSRMData(start.lat, start.lon, end.lat, end.lon, travelMode);

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No routes found between these locations');
  }

  // enrichRoute is now async — run all in parallel
  return Promise.all(data.routes.map((r, i) => enrichRoute(r, i, timeMode)));
};

/**
 * Fetch a genuinely different alternative route for rerouting.
 *
 * Strategy:
 * 1. Fetch all OSRM alternatives from the current position
 * 2. Score each by a combined metric: safetyScore + geometric divergence from currentCoords
 * 3. Return the route that is MOST different from the current route geometry
 *    while still being reasonably safe
 *
 * This ensures rerouting always produces a visually distinct polyline.
 *
 * @param {{ lat: number, lon: number }} start - Current position
 * @param {{ lat: number, lon: number }} end - Destination
 * @param {string} timeMode
 * @param {string} travelMode
 * @param {Array} currentCoords - [[lat,lon],...] of the route being replaced
 * @returns {Promise<{ routeCoords: Array, safetyScore: number, riskLevel: string } | null>}
 */
export const getAlternativeRoute = async (start, end, timeMode, travelMode, currentCoords) => {
  if (!start?.lat || !start?.lon || !end?.lat || !end?.lon) return null;

  const data = await fetchOSRMData(start.lat, start.lon, end.lat, end.lon, travelMode);

  if (!data.routes || data.routes.length === 0) return null;

  const enriched = await Promise.all(data.routes.map((r, i) => enrichRoute(r, i, timeMode)));

  if (enriched.length === 1) {
    // Only one route available — return it even if it's the same geometry
    return enriched[0];
  }

  // Score each candidate by: divergence (70%) + safety (30%)
  // This strongly prefers geometrically different routes
  const scored = enriched.map(route => {
    const divergence = geometricDivergence(currentCoords, route.routeCoords);
    const safetyNorm = route.safetyScore / 100;
    const combinedScore = divergence * 0.7 + safetyNorm * 0.3;
    return { ...route, combinedScore, divergence };
  });

  // Sort by combined score descending — most different + safe wins
  scored.sort((a, b) => b.combinedScore - a.combinedScore);

  // Never return the same route if a different one exists
  // If the top result has near-zero divergence and there's an alternative, skip it
  const best = scored[0];
  if (best.divergence < 0.05 && scored.length > 1) {
    return scored[1];
  }

  return best;
};
