import { useState, useEffect } from 'react';
import type { Feature } from 'geojson';
import { startFloodPoller, startReportPoller } from './services/poller';
import type { FloodPolygonResult } from './api/floodApi';
import type { Report } from './api/reportApi';
import * as mapManager from './map/mapManager';
import { Header, MapView, Legend, ReportHazardButton, GetMeOutButton, EmergencyToolbar } from './components';

export default function App() {
  const [floodFeatures, setFloodFeatures] = useState<FloodPolygonResult[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [route, setRoute] = useState<Feature | null>(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Loading flood data…');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Wire flood poller
  useEffect(() => {
    const cleanup = startFloodPoller(
      (results) => {
        setFloodFeatures(results);
        setStatusError(null);
        const now = new Date();
        setLastFetch(now);
        const activeCount = results.filter((r) => r.warning.severityLevel <= 3).length;
        setStatusMessage(
          `${activeCount} active warning${activeCount !== 1 ? 's' : ''} · Last updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        );
      }
    );
    return cleanup;
  }, []);

  // Wire report poller
  useEffect(() => {
    const cleanup = startReportPoller((fetched) => {
      setReports(fetched);
    });
    return cleanup;
  }, []);

  const warningCount = floodFeatures.filter((r) => r.warning.severityLevel <= 3).length;

  return (
    <div id="app">
      <Header
        warningCount={warningCount}
        lastFetch={lastFetch}
        emergencyMode={emergencyMode}
        onToggleEmergency={() => setEmergencyMode((prev) => !prev)}
        statusError={statusError}
      />
      <MapView
        floodFeatures={floodFeatures}
        reports={reports}
        route={route}
        emergencyMode={emergencyMode}
        onRouteChange={setRoute}
      />
      <Legend />
      <ReportHazardButton />
      <GetMeOutButton
        reports={reports}
        getHighRiskZones={() => mapManager.getHighRiskZones()}
        onRouteChange={setRoute}
      />
      <EmergencyToolbar emergencyMode={emergencyMode} />
    </div>
  );
}
