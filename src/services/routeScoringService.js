/**
 * routeScoringService.js — Contextual Safety Confidence Engine
 *
 * Evaluates route safety confidence using real OpenStreetMap environmental
 * context fetched via the Overpass API.
 *
 * Formula:
 *   SafetyConfidence = w1·CrowdDensity + w2·LightingConfidence
 *                    + w3·EmergencyAccessibility + w4·TimeOfDayConfidence
 *                    - w5·Isolation + w6·IncidentPenalty
 *
 * All factors normalized to [0, 100]. Final score clamped to [15, 95].
 *
 * IMPORTANT: This estimates contextual travel safety confidence.
 * It does NOT predict crime.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// ─── In-memory cache keyed by rounded lat/lon grid cell ──────────────────────
const _cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(lat, lon, radius) {
  // Round to 3 decimal places (~111m grid) to reuse nearby queries
  return `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
}

async function overpassQuery(query) {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'AegisPath/1.0',
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass error ${res.status}`);
  return res.json();
}

/**
 * Fetch POI context around a single point with caching.
 * Returns counts of relevant OSM features within the radius.
 */
async function fetchPointContext(lat, lon, radiusM = 300) {
  const key = cacheKey(lat, lon, radiusM);
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const query = `
    [out:json][timeout:8];
    (
      node["amenity"~"cafe|restaurant|bar|fast_food|bank|pharmacy|hospital|police|school|university|bus_station|marketplace"](around:${radiusM},${lat},${lon});
      node["shop"](around:${radiusM},${lat},${lon});
      node["public_transport"="stop_position"](around:${radiusM},${lat},${lon});
      way["highway"~"primary|secondary|trunk"](around:${radiusM},${lat},${lon});
      way["highway"~"footway|path|track"](around:${radiusM},${lat},${lon});
      node["amenity"="police"](around:${radiusM},${lat},${lon});
      node["amenity"="hospital"](around:${radiusM},${lat},${lon});
    );
    out count;
  `;

  try {
    const data = await overpassQuery(query);
    const counts = data?.elements?.[0]?.tags ?? {};

    const result = {
      totalPOI:        parseInt(counts.total ?? 0, 10),
      nodes:           parseInt(counts.nodes ?? 0, 10),
      ways:            parseInt(counts.ways ?? 0, 10),
    };

    // Re-query for specific counts we need
    const detailQuery = `
      [out:json][timeout:8];
      (
        node["amenity"~"cafe|restaurant|bar|fast_food|bank|pharmacy|marketplace|shop"](around:${radiusM},${lat},${lon});
        node["shop"](around:${radiusM},${lat},${lon});
        node["public_transport"="stop_position"](around:${radiusM},${lat},${lon});
        node["amenity"~"bus_station|subway_entrance"](around:${radiusM},${lat},${lon});
      );
      out count;
    `;
    const detailData = await overpassQuery(detailQuery);
    const dc = detailData?.elements?.[0]?.tags ?? {};
    result.commercialPOI = parseInt(dc.total ?? 0, 10);

    const emergencyQuery = `
      [out:json][timeout:8];
      (
        node["amenity"~"police|hospital|fire_station"](around:${radiusM},${lat},${lon});
        way["amenity"~"police|hospital"](around:${radiusM},${lat},${lon});
      );
      out count;
    `;
    const eData = await overpassQuery(emergencyQuery);
    const ec = eData?.elements?.[0]?.tags ?? {};
    result.emergencyServices = parseInt(ec.total ?? 0, 10);

    const roadQuery = `
      [out:json][timeout:8];
      (
        way["highway"~"primary|secondary|trunk|motorway"](around:${radiusM},${lat},${lon});
      );
      out count;
    `;
    const rData = await overpassQuery(roadQuery);
    const rc = rData?.elements?.[0]?.tags ?? {};
    result.majorRoads = parseInt(rc.total ?? 0, 10);

    const isolationQuery = `
      [out:json][timeout:8];
      (
        way["highway"~"footway|path|track|unclassified"](around:${radiusM},${lat},${lon});
      );
      out count;
    `;
    const iData = await overpassQuery(isolationQuery);
    const ic = iData?.elements?.[0]?.tags ?? {};
    result.isolatedPaths = parseInt(ic.total ?? 0, 10);

    _cache.set(key, { ts: Date.now(), data: result });
    return result;
  } catch (_) {
    // Return neutral defaults on API failure
    const fallback = {
      totalPOI: 5, nodes: 5, ways: 2,
      commercialPOI: 3, emergencyServices: 0,
      majorRoads: 1, isolatedPaths: 1,
    };
    _cache.set(key, { ts: Date.now(), data: fallback });
    return fallback;
  }
}

// ─── Factor calculators ───────────────────────────────────────────────────────

/** Crowd density from commercial POI count. Normalized 0–100. */
function calcCrowdDensity(commercialPOI, hour) {
  // Base score from POI count (saturates at ~20 POIs)
  const base = Math.min(100, (commercialPOI / 20) * 100);

  // Time-of-day multiplier
  const timeMult =
    (hour >= 8  && hour < 20) ? 1.0  :
    (hour >= 6  && hour < 8)  ? 0.65 :
    (hour >= 20 && hour < 22) ? 0.45 :
    0.2;

  return Math.round(base * timeMult);
}

/** Lighting confidence from major roads + commercial density + time. */
function calcLightingConfidence(majorRoads, commercialPOI, hour) {
  const roadScore = Math.min(100, (majorRoads / 5) * 100);
  const poiScore  = Math.min(100, (commercialPOI / 15) * 100);
  const base = roadScore * 0.5 + poiScore * 0.5;

  // Night penalty
  const timePenalty =
    (hour >= 22 || hour < 5) ? 35 :
    (hour >= 20)              ? 20 :
    (hour >= 18)              ? 8  : 0;

  return Math.max(0, Math.round(base - timePenalty));
}

/** Isolation score — higher = more isolated = LOWER safety. Returns 0–100 danger. */
function calcIsolationDanger(isolatedPaths, totalPOI) {
  const pathDanger = Math.min(100, (isolatedPaths / 5) * 60);
  const poiSafety  = Math.min(40, (totalPOI / 20) * 40);
  return Math.max(0, Math.round(pathDanger - poiSafety));
}

/** Emergency accessibility from nearby police/hospital/fire. */
function calcEmergencyAccessibility(emergencyServices, majorRoads) {
  const serviceScore = Math.min(70, emergencyServices * 25);
  const roadScore    = Math.min(30, majorRoads * 8);
  return Math.min(100, serviceScore + roadScore);
}

/** Time-of-day confidence. Pure time-based. */
function calcTimeConfidence(hour) {
  if (hour >= 8  && hour < 17) return 92;
  if (hour >= 6  && hour < 8)  return 75;
  if (hour >= 17 && hour < 20) return 65;
  if (hour >= 20 && hour < 22) return 42;
  return 18;
}

/** Mock incident penalty — lightweight local clustering. */
function calcIncidentPenalty(lat, lon, hour) {
  // Deterministic pseudo-random based on grid cell + hour bucket
  // Simulates incident clustering without any backend
  const gridLat = Math.floor(lat * 100);
  const gridLon = Math.floor(lon * 100);
  const hourBucket = Math.floor(hour / 4); // 6 buckets of 4h
  const seed = ((gridLat * 31 + gridLon) * 17 + hourBucket) % 100;

  // Night hours have higher incident probability
  const nightBoost = (hour >= 20 || hour < 6) ? 15 : 0;
  return Math.min(30, Math.max(0, (seed % 20) + nightBoost));
}

// ─── Weights ──────────────────────────────────────────────────────────────────
const W = {
  crowd:     0.25,
  lighting:  0.22,
  emergency: 0.18,
  time:      0.20,
  isolation: 0.10, // subtracted
  incident:  0.05, // subtracted
};

// ─── Main scoring function ────────────────────────────────────────────────────

/**
 * Score a route for Safety Confidence using OSM environmental context.
 *
 * Samples up to MAX_SAMPLES evenly-spaced points along the route,
 * fetches Overpass context for each, averages the results.
 *
 * @param {Array<[number,number]>} routeCoords - [[lat,lon], ...]
 * @param {number} hour - Hour of day 0–23
 * @returns {Promise<{
 *   safetyScore: number,
 *   riskLevel: string,
 *   factors: object,
 *   tags: string[],
 * }>}
 */
export async function scoreRouteContextual(routeCoords, hour) {
  const MAX_SAMPLES = 4; // max Overpass calls per route — keeps latency low

  if (!routeCoords || routeCoords.length === 0) {
    return buildResult(50, hour, {
      crowd: 50, lighting: 50, emergency: 30, time: calcTimeConfidence(hour),
      isolationDanger: 20, incidentPenalty: 10,
    });
  }

  // Sample evenly-spaced points
  const step = Math.max(1, Math.floor(routeCoords.length / MAX_SAMPLES));
  const samplePoints = [];
  for (let i = 0; i < routeCoords.length; i += step) {
    samplePoints.push(routeCoords[i]);
    if (samplePoints.length >= MAX_SAMPLES) break;
  }

  // Fetch context for all sample points in parallel
  const contexts = await Promise.all(
    samplePoints.map(([lat, lon]) => fetchPointContext(lat, lon, 300))
  );

  // Average all context values
  const avg = contexts.reduce(
    (acc, ctx) => {
      acc.commercialPOI    += ctx.commercialPOI;
      acc.emergencyServices += ctx.emergencyServices;
      acc.majorRoads       += ctx.majorRoads;
      acc.isolatedPaths    += ctx.isolatedPaths;
      acc.totalPOI         += ctx.totalPOI;
      return acc;
    },
    { commercialPOI: 0, emergencyServices: 0, majorRoads: 0, isolatedPaths: 0, totalPOI: 0 }
  );
  const n = contexts.length || 1;
  Object.keys(avg).forEach(k => { avg[k] = avg[k] / n; });

  // Calculate midpoint for incident penalty
  const mid = routeCoords[Math.floor(routeCoords.length / 2)];
  const incidentPenalty = calcIncidentPenalty(mid[0], mid[1], hour);

  const factors = {
    crowd:           calcCrowdDensity(avg.commercialPOI, hour),
    lighting:        calcLightingConfidence(avg.majorRoads, avg.commercialPOI, hour),
    emergency:       calcEmergencyAccessibility(avg.emergencyServices, avg.majorRoads),
    time:            calcTimeConfidence(hour),
    isolationDanger: calcIsolationDanger(avg.isolatedPaths, avg.totalPOI),
    incidentPenalty,
  };

  return buildResult(null, hour, factors);
}

function buildResult(overrideScore, hour, factors) {
  const raw = overrideScore ?? (
    factors.crowd     * W.crowd +
    factors.lighting  * W.lighting +
    factors.emergency * W.emergency +
    factors.time      * W.time -
    factors.isolationDanger * W.isolation -
    factors.incidentPenalty * W.incident
  );

  // Clamp to [15, 95] — avoid unrealistic extremes
  const safetyScore = Math.max(15, Math.min(95, Math.round(raw)));

  const riskLevel =
    safetyScore >= 65 ? 'LOW' :
    safetyScore >= 40 ? 'MODERATE' : 'HIGH';

  // Generate explanation tags
  const tags = [];
  if (factors.crowd >= 60)           tags.push('High footfall area');
  else if (factors.crowd < 30)       tags.push('Low crowd density');
  if (factors.lighting >= 65)        tags.push('Well-lit corridor');
  else if (factors.lighting < 35)    tags.push('Poor lighting');
  if (factors.emergency >= 50)       tags.push('Emergency services nearby');
  if (factors.isolationDanger >= 40) tags.push('Isolated stretches');
  if (factors.time < 40)             tags.push('Late-night travel');
  else if (factors.time >= 80)       tags.push('Daytime travel');
  if (factors.incidentPenalty >= 20) tags.push('Elevated incident area');

  return {
    safetyScore,
    riskLevel,
    factors: {
      crowd:     factors.crowd,
      lighting:  factors.lighting,
      emergency: factors.emergency,
      time:      factors.time,
      isolation: factors.isolationDanger,
      incident:  factors.incidentPenalty,
    },
    tags,
  };
}

/**
 * Build a zone object compatible with calcRiskScore / TimeImpactScreen.
 */
export function buildZoneFromContextual(factors) {
  return {
    crimeLevel: Math.max(0, Math.min(100, 100 - factors.crowd)),
    crowdLevel: factors.crowd >= 60 ? 'busy' : factors.crowd >= 35 ? 'moderate' : 'isolated',
    infraLevel: factors.emergency >= 60 ? 'full' : factors.emergency >= 35 ? 'mixed' : 'poor',
  };
}
