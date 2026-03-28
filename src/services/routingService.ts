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

export async function geocodeAddress(query: string): Promise<[number, number]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=gb&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (!data.length) {
    throw new GeolocationError(`Could not find "${query}" — try a full postcode or town name.`);
  }
  return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
}

export async function computeSafeRoute(
  origin: [number, number],
  destination: [number, number],
  hazardFeatures: Feature[]
): Promise<Feature> {
  // Buffer each hazard point/polygon by 200 m and filter out nulls
  const buffers = hazardFeatures
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
    // ORS expects a GeoJSON geometry object, not a Feature wrapper
    body.options = { avoid_polygons: avoidPolygon.geometry ?? avoidPolygon };
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
      const errText = await response.text();
      console.error('[ORS] Error response:', response.status, errText);
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
