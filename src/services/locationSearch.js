/**
 * locationSearch.js — Free location search via Nominatim (OpenStreetMap).
 * No API key required. Rate limit: 1 req/sec.
 */

/**
 * Search for locations matching a query string.
 * Returns array of { label, lat, lon, displayName }
 */
export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const encoded = encodeURIComponent(query.trim());
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=in&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'AegisPath/1.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(item => ({
      label: item.display_name.split(',').slice(0, 2).join(', '),
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch (_) {
    return [];
  }
}
