const API_BASE_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env?.VITE_API_BASE_URL ??
  'http://localhost:8000';

/**
 * Typed error for Report API failures.
 */
export class ReportApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ReportApiError';
    this.status = status;
  }
}

export interface ReportPayload {
  hazardType: string;
  coordinates: [number, number]; // [lng, lat]
  description?: string;          // max 280 chars
}

export interface Report extends ReportPayload {
  id: string;
  createdAt: string; // ISO 8601
}

/**
 * POSTs a hazard report to the backend.
 * Throws ReportApiError on non-ok responses.
 */
export async function postReport(payload: ReportPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ReportApiError(
      `Failed to post report: ${response.status} ${response.statusText}`,
      response.status
    );
  }
}

/**
 * Fetches all hazard reports from the backend.
 * Throws ReportApiError on non-ok responses.
 */
export async function getReports(): Promise<Report[]> {
  const response = await fetch(`${API_BASE_URL}/reports`);

  if (!response.ok) {
    throw new ReportApiError(
      `Failed to fetch reports: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  return response.json();
}
