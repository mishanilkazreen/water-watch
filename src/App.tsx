import { useState, useEffect, useRef } from 'react';
import type { Feature } from 'geojson';
import { startFloodPoller, startReportPoller } from './services/poller';
import type { FloodPolygonResult } from './api/floodApi';
import type { Report } from './api/reportApi';
import { getDevHazards, postDevHazard, getDevShelters, postDevShelter } from './api/devApi';
import * as mapManager from './map/mapManager';
import { Header, MapView, ReportHazardButton, GetMeOutButton, EmergencyToolbar, ShelterPanel, DevToolbar } from './components';
import { SHELTERS } from './data/shelters';
import type { Shelter } from './data/shelters';

export default function App() {
  const [floodFeatures, setFloodFeatures] = useState<FloodPolygonResult[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [route, setRoute] = useState<Feature | null>(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Loading flood data…');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [devShelters, setDevShelters] = useState<Shelter[]>([]);
  const [devHazards, setDevHazards] = useState<[number, number][]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Load persisted dev hazards and shelters on startup
  useEffect(() => {
    getDevHazards().then((hazards) => {
      setDevHazards(hazards.map((h) => h.coordinates as [number, number]));
    }).catch(() => {});

    getDevShelters().then((shelters) => {
      setDevShelters(
        shelters.map((s) => ({
          id: s.id,
          name: s.name,
          coordinates: s.coordinates as [number, number],
          type: s.type as Shelter['type'],
        }))
      );
    }).catch(() => {});
  }, []);

  // Sync dev hazard map markers whenever devHazards changes
  const prevHazardCount = useRef(0);
  useEffect(() => {
    const newOnes = devHazards.slice(prevHazardCount.current);
    newOnes.forEach((c) => mapManager.addDevHazard(c));
    prevHazardCount.current = devHazards.length;
  }, [devHazards]);

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

  // Track user location via geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      () => {} // silently ignore denial — panel handles the null state
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const warningCount = floodFeatures.filter((r) => r.warning.severityLevel <= 3).length;

  const allShelters = [...SHELTERS, ...devShelters];

  const devHazardFeatures: Feature[] = devHazards.map((coords) => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: coords },
  }));

  const getAllAvoidFeatures = (): Feature[] => [
    ...mapManager.getHighRiskZones(),
    ...devHazardFeatures,
  ];

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
      <ReportHazardButton />
      <GetMeOutButton
        reports={reports}
        getHighRiskZones={getAllAvoidFeatures}
        onRouteChange={setRoute}
      />
      <EmergencyToolbar emergencyMode={emergencyMode} />
      <ShelterPanel
        shelters={allShelters}
        userLocation={userLocation}
        reports={reports}
        getHighRiskZones={getAllAvoidFeatures}
        onRouteChange={setRoute}
      />
      <DevToolbar
        onHazardPlaced={(coords) => {
          postDevHazard(coords).catch(() => {});
          setDevHazards((prev) => [...prev, coords]);
        }}
        onShelterPlaced={(shelter) => {
          postDevShelter(shelter).catch(() => {});
          setDevShelters((prev) => [...prev, shelter]);
        }}
      />
    </div>
  );
}
