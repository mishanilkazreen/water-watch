import { useState, useEffect } from 'react';
import * as mapManager from '../map/mapManager';
import { Shelter } from '../data/shelters';

interface DevToolbarProps {
  onHazardPlaced: (coords: [number, number]) => void;
  onShelterPlaced: (shelter: Shelter) => void;
}

type ActiveTool = 'hazard' | 'shelter' | null;

export default function DevToolbar({ onHazardPlaced, onShelterPlaced }: DevToolbarProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [mapReady, setMapReady] = useState(false);

  // Poll until the map instance is available
  useEffect(() => {
    if (mapManager.getMap()) {
      setMapReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (mapManager.getMap()) {
        setMapReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Manage cursor based on active tool
  useEffect(() => {
    const m = mapManager.getMap();
    if (!m) return;
    m.getCanvas().style.cursor = activeTool ? 'crosshair' : '';
  }, [activeTool]);

  function deactivate() {
    setActiveTool(null);
  }

  function handleHazardClick() {
    if (activeTool === 'hazard') {
      deactivate();
      return;
    }

    const m = mapManager.getMap();
    if (!m) return;

    setActiveTool('hazard');

    m.once('click', (e) => {
      onHazardPlaced([e.lngLat.lng, e.lngLat.lat]);
      setActiveTool(null);
    });
  }

  function handleShelterClick() {
    if (activeTool === 'shelter') {
      deactivate();
      return;
    }

    const m = mapManager.getMap();
    if (!m) return;

    setActiveTool('shelter');

    m.once('click', (e) => {
      const name = window.prompt('Shelter name:');
      if (name) {
        onShelterPlaced({
          id: crypto.randomUUID(),
          name,
          coordinates: [e.lngLat.lng, e.lngLat.lat],
          type: 'shelter',
        });
      }
      setActiveTool(null);
    });
  }

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: '#f59e0b',
    borderBottom: '2px solid #d97706',
    flexShrink: 0,
    zIndex: 20,
  };

  const badgeStyle: React.CSSProperties = {
    background: '#92400e',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '2px 7px',
    borderRadius: '4px',
    marginRight: '4px',
  };

  const baseButtonStyle: React.CSSProperties = {
    padding: '5px 12px',
    border: '2px solid transparent',
    borderRadius: '5px',
    cursor: mapReady ? 'pointer' : 'not-allowed',
    fontWeight: 600,
    fontSize: '13px',
    opacity: mapReady ? 1 : 0.5,
  };

  const hazardStyle: React.CSSProperties = {
    ...baseButtonStyle,
    background: activeTool === 'hazard' ? '#b45309' : '#78350f',
    color: '#fff',
    borderColor: activeTool === 'hazard' ? '#92400e' : 'transparent',
  };

  const shelterStyle: React.CSSProperties = {
    ...baseButtonStyle,
    background: activeTool === 'shelter' ? '#b45309' : '#78350f',
    color: '#fff',
    borderColor: activeTool === 'shelter' ? '#92400e' : 'transparent',
  };

  return (
    <div style={toolbarStyle} aria-label="Dev Mode toolbar">
      <span style={badgeStyle}>Dev Mode</span>
      <button
        style={hazardStyle}
        onClick={handleHazardClick}
        disabled={!mapReady}
        title="Click the map to place a hazard marker"
        aria-pressed={activeTool === 'hazard'}
      >
        ⚠️ Place Hazard
      </button>
      <button
        style={shelterStyle}
        onClick={handleShelterClick}
        disabled={!mapReady}
        title="Click the map to place a shelter marker"
        aria-pressed={activeTool === 'shelter'}
      >
        🏠 Place Shelter
      </button>
      {activeTool && (
        <span style={{ fontSize: '12px', color: '#78350f', fontStyle: 'italic' }}>
          Click the map to place…
        </span>
      )}
    </div>
  );
}
