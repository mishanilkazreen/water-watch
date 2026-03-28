export interface Shelter {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  type: 'shelter' | 'medical';
}

// Manually populated placeholder list
export const SHELTERS: Shelter[] = [];

export function parseShelters(raw: unknown[]): Shelter[] {
  const results: Shelter[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      console.warn('parseShelters: skipping non-object entry', entry);
      continue;
    }

    const e = entry as Record<string, unknown>;

    // Validate id
    const id = typeof e.id === 'string' ? e.id : String(Math.random());

    // Validate name
    if (typeof e.name !== 'string' || e.name.trim() === '') {
      console.warn('parseShelters: skipping entry with invalid name', entry);
      continue;
    }

    // Validate coordinates
    if (
      !Array.isArray(e.coordinates) ||
      e.coordinates.length !== 2 ||
      typeof e.coordinates[0] !== 'number' ||
      typeof e.coordinates[1] !== 'number' ||
      e.coordinates[0] < -180 ||
      e.coordinates[0] > 180 ||
      e.coordinates[1] < -90 ||
      e.coordinates[1] > 90
    ) {
      console.warn('parseShelters: skipping entry with invalid coordinates', entry);
      continue;
    }

    // Validate type
    if (e.type !== 'shelter' && e.type !== 'medical') {
      console.warn('parseShelters: skipping entry with invalid type', entry);
      continue;
    }

    results.push({
      id,
      name: e.name.trim(),
      coordinates: [e.coordinates[0], e.coordinates[1]],
      type: e.type,
    });
  }

  return results;
}
