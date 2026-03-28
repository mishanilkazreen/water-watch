import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as mapManager from '../map/mapManager';
import { Feature, Polygon } from 'geojson';

interface EmergencyToolbarProps {
  emergencyMode: boolean;
}

type ActiveTool = 'shelter' | 'zone' | null;

export default function EmergencyToolbar({ emergencyMode }: EmergencyToolbarProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [zonePoints, setZonePoints] = useState<[number, number][]>([]);
  const zoneClickHandlerRef = useRef<((e: mapboxgl.MapMouseEvent) => void) | null>(null);

  // Clean up zone click listener when tool changes or component unmounts
  useEffect(() => {
    return () => {
      if (zoneClickHandlerRef.current) {
        const m = mapManager.getMap();
        if (m) m.off('click', zoneClickHandlerRef.current);
        zoneClickHandlerRef.current = null;
      }
    };
  }, []);

  // When emergency mode turns off, reset tool state (placed items stay on map via mapManager)
  useEffect(() => {
    if (!emergencyMode) {
      cancelZoneTool();
      setActiveTool(null);
    }
  }, [emergencyMode]);

  if (!emergencyMode) return null;

  function cancelZoneTool() {
    if (zoneClickHandlerRef.current) {
      const m = mapManager.getMap();
      if (m) m.off('click', zoneClickHandlerRef.current);
      zoneClickHandlerRef.current = null;
    }
    setZonePoints([]);
  }

  function handleShelterClick() {
    // Cancel any active zone tool first
    if (activeTool === 'zone') {
      cancelZoneTool();
    }

    if (activeTool === 'shelter') {
      // Toggle off
      setActiveTool(null);
      return;
    }

    const m = mapManager.getMap();
    if (!m) return;

    setActiveTool('shelter');

    m.once('click', (e) => {
      mapManager.addShelter([e.lngLat.lng, e.lngLat.lat]);
      setActiveTool(null);
    });
  }

  function handleZoneClick() {
    if (activeTool === 'zone') {
      // Toggle off — cancel drawing
      cancelZoneTool();
      setActiveTool(null);
      return;
    }

    // Cancel shelter tool if active
    setActiveTool('zone');
    setZonePoints([]);

    const m = mapManager.getMap();
    if (!m) return;

    const handler = (e: mapboxgl.MapMouseEvent) => {
      setZonePoints((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
    };

    zoneClickHandlerRef.current = handler;
    m.on('click', handler);
  }

  function handleCompleteZone() {
    if (zonePoints.length < 3) return;

    // Close the ring by repeating the first point
    const ring: [number, number][] = [...zonePoints, zonePoints[0]];

    const feature: Feature<Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    };

    mapManager.addHighRiskZone(feature);
    cancelZoneTool();
    setActiveTool(null);
  }

  const baseButtonStyle: React.CSSProperties = {
    padding: '8px 14px',
    border: '2px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    transition: 'background 0.15s, border-color 0.15s',
  };

  const shelterStyle: React.CSSProperties = {
    ...baseButtonStyle,
    background: activeTool === 'shelter' ? '#f39c12' : '#2c3e50',
    color: '#fff',
    borderColor: activeTool === 'shelter' ? '#e67e22' : 'transparent',
  };

  const zoneStyle: React.CSSProperties = {
    ...baseButtonStyle,
    background: activeTool === 'zone' ? '#8e44ad' : '#2c3e50',
    color: '#fff',
    borderColor: activeTool === 'zone' ? '#6c3483' : 'transparent',
  };

  const completeStyle: React.CSSProperties = {
    ...baseButtonStyle,
    background: '#27ae60',
    color: '#fff',
    borderColor: 'transparent',
  };

  const toolbarStyle: React.CSSProperties = {
    position: 'absolute',
    top: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(20, 20, 30, 0.92)',
    border: '1px solid #8e44ad',
    borderRadius: '8px',
    padding: '8px 12px',
    zIndex: 10,
    boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
  };

  const labelStyle: React.CSSProperties = {
    color: '#c39bd3',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginRight: '4px',
  };

  return (
    <div style={toolbarStyle}>
      <span style={labelStyle}>Emergency Tools</span>
      <button style={shelterStyle} onClick={handleShelterClick} title="Click map to place a shelter">
        🏠 Place Shelter
      </button>
      <button style={zoneStyle} onClick={handleZoneClick} title="Click map points to draw a high-risk zone">
        ⚠️ Mark High-Risk Zone
      </button>
      {activeTool === 'zone' && zonePoints.length >= 3 && (
        <button style={completeStyle} onClick={handleCompleteZone}>
          ✓ Complete Zone ({zonePoints.length} points)
        </button>
      )}
      {activeTool === 'zone' && (
        <span style={{ color: '#aaa', fontSize: '12px' }}>
          {zonePoints.length < 3
            ? `Click map to add points (${zonePoints.length}/3 min)`
            : `${zonePoints.length} points — complete or keep adding`}
        </span>
      )}
    </div>
  );
}
