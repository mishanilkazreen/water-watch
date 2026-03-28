import { fetchFloodPolygons, FloodPolygonResult } from '../api/floodApi';
import { getReports, Report } from '../api/reportApi';

/**
 * Starts polling for flood polygon data.
 * Calls onData immediately, then every intervalMs milliseconds.
 * Returns a cleanup function that cancels the interval (compatible with React useEffect).
 */
export function startFloodPoller(
  onData: (results: FloodPolygonResult[]) => void,
  intervalMs = 60000
): () => void {
  const poll = () => {
    fetchFloodPolygons().then(onData).catch(() => {/* silently swallow errors */});
  };

  poll();
  const id = setInterval(poll, intervalMs);
  return () => clearInterval(id);
}

/**
 * Starts polling for hazard reports.
 * Calls onData immediately, then every intervalMs milliseconds.
 * Returns a cleanup function that cancels the interval (compatible with React useEffect).
 */
export function startReportPoller(
  onData: (reports: Report[]) => void,
  intervalMs = 10000
): () => void {
  const poll = () => {
    getReports().then(onData).catch(() => {/* silently swallow errors */});
  };

  poll();
  const id = setInterval(poll, intervalMs);
  return () => clearInterval(id);
}
