const API_BASE_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env?.VITE_API_BASE_URL ??
  'http://localhost:8000';

export interface DevHazard {
  id: string;
  coordinates: [number, number];
  createdAt: string;
}

export interface DevShelterPayload {
  id: string;
  name: string;
  coordinates: [number, number];
  type: 'shelter' | 'medical';
}

export interface DevShelter extends DevShelterPayload {
  createdAt: string;
}

export async function postDevHazard(coordinates: [number, number]): Promise<DevHazard> {
  const res = await fetch(`${API_BASE_URL}/dev/hazards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates }),
  });
  if (!res.ok) throw new Error(`Failed to save dev hazard: ${res.status}`);
  return res.json();
}

export async function getDevHazards(): Promise<DevHazard[]> {
  const res = await fetch(`${API_BASE_URL}/dev/hazards`);
  if (!res.ok) throw new Error(`Failed to fetch dev hazards: ${res.status}`);
  return res.json();
}

export async function postDevShelter(payload: DevShelterPayload): Promise<DevShelter> {
  const res = await fetch(`${API_BASE_URL}/dev/shelters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to save dev shelter: ${res.status}`);
  return res.json();
}

export async function getDevShelters(): Promise<DevShelter[]> {
  const res = await fetch(`${API_BASE_URL}/dev/shelters`);
  if (!res.ok) throw new Error(`Failed to fetch dev shelters: ${res.status}`);
  return res.json();
}
