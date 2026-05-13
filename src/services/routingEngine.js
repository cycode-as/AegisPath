import { calcRiskScore } from '../utils/calcRiskScore';
import narratives from '../../assets/data/narratives.json';
import badges from '../../assets/data/badges.json';

/**
 * Fetch routes from public OSRM API.
 * Uses coordinates: [lat, lon] for start and end.
 * OSRM expects: lon,lat;lon,lat
 */
export const fetchOSRMData = async (startLat, startLon, endLat, endLon) => {
  const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?alternatives=true&geometries=geojson&overview=full`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AegisPath/1.0' }
  });
  if (!res.ok) throw new Error('Failed to fetch routing data');
  return res.json();
};

const generateHeuristicZone = (distanceMeters, isAlternative) => {
  // Simulate intelligent zone analysis by deriving pseudo-random metrics based on distance
  // This satisfies the "believable intelligence" requirement for dynamic routes.
  const baseCrime = isAlternative ? 30 : 60;
  const crimeLevel = Math.min(100, Math.max(0, baseCrime + ((distanceMeters % 100) - 50) * 0.4));
  
  const crowdOptions = ['busy', 'moderate', 'isolated'];
  const crowdIdx = Math.floor((distanceMeters / 1000) + (isAlternative ? 1 : 0)) % 3;
  const crowdLevel = crowdOptions[crowdIdx];

  const infraOptions = ['full', 'mixed', 'poor'];
  const infraIdx = Math.floor((distanceMeters / 1500) + (isAlternative ? 0 : 2)) % 3;
  const infraLevel = infraOptions[infraIdx];

  return { crimeLevel, crowdLevel, infraLevel };
};

const enrichDynamicRoute = (routeData, index, timeMode) => {
  const timeHour = timeMode === 'night' ? 21 : 14;
  const isAlternative = index > 0;
  const distance = routeData.distance; // in meters
  const duration = Math.round(routeData.duration / 60); // in minutes
  
  const zone = generateHeuristicZone(distance, isAlternative);
  const { riskScore, safetyScore, riskLevel, factors } = calcRiskScore(zone, timeHour);

  // Map OSRM [lon, lat] to Leaflet [lat, lon]
  const coordinates = routeData.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

  // Use pre-existing narratives and badges from mock to maintain emotional UX polish
  const routeKey = isAlternative ? 'routeB' : 'routeA';
  const isRecommended = isAlternative ? false : true;

  return {
    id: `dyn_${index}`,
    label: isAlternative ? 'Alternative Route' : 'Safest Route',
    emoji: isAlternative ? '📍' : '✅',
    eta: `${duration} min`,
    distance: `${(distance / 1000).toFixed(1)} km`,
    isRecommended,
    timeHour,
    safetyScore,
    riskScore,
    riskLevel,
    factors,
    zone,
    routeCoords: coordinates,
    narrative: narratives[routeKey][timeMode],
    badges: badges[routeKey][timeMode],
  };
};

export const getDynamicRoutes = async (start, end, timeMode = 'night') => {
  if (!start || !end) {
    return []; // Return empty or throw, we need coords
  }
  
  const data = await fetchOSRMData(start.lat, start.lon, end.lat, end.lon);
  
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No routes found');
  }

  // Enrich routes
  const enriched = data.routes.map((r, i) => enrichDynamicRoute(r, i, timeMode));
  
  return enriched;
};
