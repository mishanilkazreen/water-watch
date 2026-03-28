import { useState, useRef } from 'react';
import type { Feature } from 'geojson';
import { haversineKm } from '../utils/haversine';
import type { Shelter } from '../data/shelters';
import type { Report } from '../api/reportApi';
import { computeSafeRoute, RouteNotFoundError } from '../services/routingService';
import * as mapManager from '../map/mapManager';

interface ShelterPanelProps {
  shelters: Shelter[];
  userLocation: [number, number] | null;
  reports: Report[];
  getHighRiskZones: () => Feature[];
  onRouteChange: (route: Feature | null) => void;
}

type RouteStatus = 'idle' | 'loading' | 'error';

interface RouteSummary {
  distanceKm: number;
  durationMin: number;
}

interface ShelterEntry extends Shelter {
  distanceKm: number | null;
  errorMessage?: string;
}

export default function ShelterPanel({
  shelters,
  userLocation,
  reports,
  getHighRiskZones,
  onRouteChange,
}: ShelterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle');
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [shelterErrors, setShelterErrors] = useState<Record<string, string>>({});

  // Track shelter IDs that already have a map marker placed
  const placedShelterIds = useRef<Set<string>>(new Set());

  // Compute distances and sort shelters
  const sheltersWithDistance: ShelterEntry[] = shelters.map((s) => ({
    ...s,
    distanceKm: userLocation ? haversineKm(userLocation, s.coordinates) : null,
    errorMessage: shelterErrors[s.id],
  }));

  const sortedShelters =
    userLocation !== null
      ? [...sheltersWithDistance].sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
      : sheltersWithDistance;

  async function handleShelterClick(shelter: ShelterEntry) {
    const { id } = shelter;

    // Second click on selected shelter — deselect and clear route
    if (selectedId === id) {
      mapManager.setRoute(null);
      onRouteChange(null);
      setSelectedId(null);
      setRouteSummary(null);
      setRouteStatus('idle');
      return;
    }

    // Missing user location
    if (!userLocation) {
      setShelterErrors((prev) => ({
        ...prev,
        [id]: 'Enable location access to get a route',
      }));
      return;
    }

    // Clear previous route before fetching new one
    mapManager.setRoute(null);
    onRouteChange(null);

    // Place a marker at the shelter if not already placed
    if (!placedShelterIds.current.has(id)) {
      mapManager.addShelter(shelter.coordinates);
      placedShelterIds.current.add(id);
    }

    setSelectedId(id);
    setRouteStatus('loading');
    setRouteSummary(null);
    setShelterErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const hazardFeatures: Feature[] = reports.map((r) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: r.coordinates },
      }));

      const route = await computeSafeRoute(
        userLocation,
        shelter.coordinates,
        [...hazardFeatures, ...getHighRiskZones()]
      );

      mapManager.setRoute(route);
      onRouteChange(route);

      const summary = (route as any).properties?.summary;
      setRouteSummary({
        distanceKm: summary.distance / 1000,
        durationMin: summary.duration / 60,
      });
      setRouteStatus('idle');
    } catch (err) {
      if (err instanceof RouteNotFoundError) {
        setShelterErrors((prev) => ({ ...prev, [id]: 'No route available' }));
        setRouteStatus('error');
      } else {
        setShelterErrors((prev) => ({ ...prev, [id]: 'No route available' }));
        setRouteStatus('error');
      }
    }
  }

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '110px',
    right: '10px',
    zIndex: 10,
    width: '220px',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
    fontFamily: 'sans-serif',
    fontSize: '13px',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    backgroundColor: '#16213e',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: isExpanded ? '1px solid #2a2a4a' : 'none',
  };

  const listContainerStyle: React.CSSProperties = {
    maxHeight: '320px',
    overflowY: 'auto',
    padding: '6px 0',
  };

  const countStyle: React.CSSProperties = {
    padding: '6px 12px 4px',
    fontSize: '11px',
    color: '#888',
    borderBottom: '1px solid #2a2a4a',
  };

  return (
    <div style={panelStyle} aria-label="Shelter navigation panel">
      {/* Header / toggle */}
      <div
        style={headerStyle}
        onClick={() => setIsExpanded((v) => !v)}
        role="button"
        aria-expanded={isExpanded}
        aria-controls="shelter-list"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsExpanded((v) => !v)}
      >
        <span style={{ fontWeight: 600 }}>🏠 Shelters</span>
        <span style={{ fontSize: '12px', color: '#aaa' }}>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {/* Collapsible body */}
      {isExpanded && (
        <div id="shelter-list">
          {/* Shelter count */}
          <div style={countStyle}>{shelters.length} shelter{shelters.length !== 1 ? 's' : ''}</div>

          {/* Location placeholder / message */}
          {userLocation === null && (
            <div
              style={{ padding: '10px 12px', color: '#aaa', fontSize: '12px', fontStyle: 'italic' }}
              role="status"
            >
              Enable location to sort by distance
            </div>
          )}

          {/* Shelter list */}
          <div style={listContainerStyle}>
            {sortedShelters.length === 0 ? (
              <div style={{ padding: '10px 12px', color: '#666', fontSize: '12px' }}>
                No shelters available
              </div>
            ) : (
              sortedShelters.map((shelter) => {
                const isSelected = shelter.id === selectedId;
                const isLoading = isSelected && routeStatus === 'loading';
                const shelterError = shelter.errorMessage;

                const itemStyle: React.CSSProperties = {
                  padding: '9px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #2a2a4a',
                  backgroundColor: isSelected ? '#0f3460' : 'transparent',
                  borderLeft: isSelected ? '3px solid #3ecf8e' : '3px solid transparent',
                  transition: 'background-color 0.15s',
                };

                return (
                  <div
                    key={shelter.id}
                    style={itemStyle}
                    onClick={() => handleShelterClick(shelter)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onKeyDown={(e) => e.key === 'Enter' && handleShelterClick(shelter)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? '#3ecf8e' : '#e0e0e0' }}>
                        {shelter.name}
                      </span>
                      {shelter.distanceKm !== null && (
                        <span style={{ color: '#aaa', fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '6px' }}>
                          {shelter.distanceKm.toFixed(1)} km
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: '2px', fontSize: '11px', color: '#888' }}>
                      {shelter.type === 'medical' ? '🏥 Medical centre' : '🏠 Shelter'}
                    </div>

                    {/* Loading indicator */}
                    {isLoading && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#3ecf8e' }}>
                        Finding route…
                      </div>
                    )}

                    {/* Route summary */}
                    {isSelected && routeSummary && routeStatus === 'idle' && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#3ecf8e' }}>
                        {routeSummary.distanceKm.toFixed(1)} km · {Math.round(routeSummary.durationMin)} min
                      </div>
                    )}

                    {/* Per-shelter error */}
                    {shelterError && (
                      <div
                        role="alert"
                        style={{ marginTop: '4px', fontSize: '11px', color: '#e07070' }}
                      >
                        {shelterError}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
