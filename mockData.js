/**
 * Live flood data from the UK Environment Agency Real-Time Flood Monitoring API.
 * No API key required — public endpoints.
 */

const FLOODS_URL = 'https://environment.data.gov.uk/flood-monitoring/id/floods';

/**
 * Fetches all active flood warnings.
 * @returns {Promise<Array>} Array of flood warning items from the API.
 */
export async function fetchFloodWarnings() {
  const response = await fetch(FLOODS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch flood warnings: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.items ?? [];
}

/**
 * Fetches the GeoJSON polygon for a flood area.
 * @param {string} polygonUrl - The polygon URL from a floodArea object.
 * @returns {Promise<object|null>} GeoJSON FeatureCollection/Feature, or null on failure.
 */
export async function fetchFloodPolygon(polygonUrl) {
  try {
    const response = await fetch(polygonUrl);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetches all active flood warning polygons as GeoJSON features.
 * Skips flood areas that have no polygon URL or fail to load.
 * @returns {Promise<Array<{feature: object, warning: object}>>}
 */
export async function fetchFloodPolygons() {
  const warnings = await fetchFloodWarnings();

  const results = await Promise.allSettled(
    warnings
      .filter((w) => w.floodArea?.polygon)
      .map(async (warning) => {
        const geojson = await fetchFloodPolygon(warning.floodArea.polygon);
        if (!geojson) return null;

        // Normalise to a single Feature — the API may return a FeatureCollection
        const feature =
          geojson.type === 'FeatureCollection'
            ? geojson.features?.[0]
            : geojson;

        if (!feature) return null;

        return {
          feature: {
            ...feature,
            properties: {
              ...(feature.properties ?? {}),
              description: warning.description ?? '',
              severityLevel: warning.severityLevel ?? '',
              severity: warning.severity ?? null,
              floodAreaID: warning.floodAreaID ?? '',
              riverOrSea: warning.floodArea?.riverOrSea ?? '',
            },
          },
          warning,
        };
      })
  );

  return results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);
}
