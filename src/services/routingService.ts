import type { Feature } from 'geojson';
import buffer from '@turf/buffer';
import union from '@turf/union';

export class RouteNotFoundError extends Error {
  constructor(message = 'No safe route found — please contact emergency services') {
    super(message);
    this.name = 'RouteNotFoundError';
  }
}

export class GeolocationError extends Error {
  constructor(message = 'Geolocation unavailable') {
    super(message);
    this.name = 'GeolocationError';
  }
}

export async function computeSafeRoute(
  origin: [number, number],
  destination: [number, number],
  floodFeatures: Feature[]
): Promise<Feature> {
  // Buffer each flood feature by 200 metres and filter out nulls
  const buffers = floodFeatures
    .map((f) => buffer(f, 200, { units: 'meters' }))
    .filter((b): b is NonNullable<typeof b> => b !== null && b !== undefined);

  // Union all buffers into a single polygon
  let avoidPolygon: Feature | null = null;
  if (buffers.length > 0) {
    avoidPolygon = buffers.reduce<Feature | null>((acc, cur) => {
      if (acc === null) return cur;
      return union(acc as any, cur as any) as Feature;
    }, null);
  }

  const body: Record<string, unknown> = {
    coordinates: [origin, destination],
  };

  if (avoidPolygon) {
    body.options = { avoid_polygons: avoidPolygon };
  }

  try {
    const response = await fetch(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: import.meta.env.VITE_ORS_API_KEY as string,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new RouteNotFoundError('No safe route found — please contact emergency services');
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new RouteNotFoundError('No safe route found — please contact emergency services');
    }

    return data.features[0] as Feature;
  } catch (err) {
    if (err instanceof RouteNotFoundError) throw err;
    throw new RouteNotFoundError(
      'No safe route found — network error, please try again'
    );
  }
}
