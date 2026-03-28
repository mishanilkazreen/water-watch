import type { Feature, FeatureCollection } from 'geojson';

const FLOODS_URL = 'https://environment.data.gov.uk/flood-monitoring/id/floods';

// --- DEV MOCK: Portsmouth test flood zone ---
function makeCirclePolygon(
  centreLng: number,
  centreLat: number,
  radiusDeg: number,
  steps = 32
): Feature {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    coords.push([
      centreLng + radiusDeg * Math.cos(angle),
      centreLat + radiusDeg * Math.sin(angle),
    ]);
  }
  return {
    type: 'Feature',
    properties: {
      description: 'DEV — Portsmouth Harbour flood risk area',
      severityLevel: 2,
      severity: 'Flood Warning',
      floodAreaID: 'dev-portsmouth-001',
      riverOrSea: 'Portsmouth Harbour',
    },
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

const MOCK_PORTSMOUTH: FloodPolygonResult = {
  feature: makeCirclePolygon(-1.087, 50.798, 0.025),
  warning: {
    floodAreaID: 'dev-portsmouth-001',
    description: 'DEV — Portsmouth Harbour flood risk area',
    severityLevel: 2,
    severity: 'Flood Warning',
    floodArea: { riverOrSea: 'Portsmouth Harbour' },
  },
};

/**
 * Typed error for EA Flood Monitoring API failures.
 */
export class FloodApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FloodApiError';
    this.status = status;
  }
}

export interface FloodWarning {
  floodAreaID: string;
  description: string;
  severityLevel: number;   // 1 Severe | 2 Warning | 3 Alert | 4 No longer in force
  severity: string;        // human-readable label
  floodArea: {
    polygon?: string;
    riverOrSea?: string;
  };
}

export interface FloodPolygonResult {
  feature: Feature;
  warning: FloodWarning;
}

/**
 * Fetches all active flood warnings from the EA API.
 * Throws FloodApiError on non-ok responses.
 */
export async function fetchFloodWarnings(): Promise<FloodWarning[]> {
  const response = await fetch(FLOODS_URL);
  if (!response.ok) {
    throw new FloodApiError(
      `Failed to fetch flood warnings: ${response.status} ${response.statusText}`,
      response.status
    );
  }
  const data = await response.json();
  return data.items ?? [];
}

/**
 * Fetches the GeoJSON polygon for a flood area.
 * Returns null on any failure so callers can skip gracefully.
 */
export async function fetchFloodPolygon(polygonUrl: string): Promise<Feature | null> {
  try {
    const response = await fetch(polygonUrl);
    if (!response.ok) return null;
    const geojson: Feature | FeatureCollection = await response.json();

    if (geojson.type === 'FeatureCollection') {
      return (geojson as FeatureCollection).features?.[0] ?? null;
    }
    return geojson as Feature;
  } catch {
    return null;
  }
}

/**
 * Fetches all active flood warning polygons as GeoJSON features.
 * Skips warnings with no polygon URL or failed polygon fetches.
 * Correctly assigns severityLevel (integer) and severity (string).
 */
export async function fetchFloodPolygons(): Promise<FloodPolygonResult[]> {
  const warnings = await fetchFloodWarnings();

  const results = await Promise.allSettled(
    warnings
      .filter((w) => w.floodArea?.polygon)
      .map(async (warning): Promise<FloodPolygonResult | null> => {
        const feature = await fetchFloodPolygon(warning.floodArea.polygon!);
        if (!feature) return null;

        return {
          feature: {
            ...feature,
            properties: {
              ...(feature.properties ?? {}),
              description: warning.description ?? '',
              severityLevel: warning.severityLevel ?? 4,   // integer field
              severity: warning.severity ?? '',             // string field
              floodAreaID: warning.floodAreaID ?? '',
              riverOrSea: warning.floodArea?.riverOrSea ?? '',
            },
          },
          warning,
        };
      })
  );

  const live = results
    .filter(
      (r): r is PromiseFulfilledResult<FloodPolygonResult> =>
        r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value);

  return [MOCK_PORTSMOUTH, ...live];
}
