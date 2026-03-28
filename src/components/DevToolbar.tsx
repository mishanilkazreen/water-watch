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

  const [open, setOpen] = useState(false);

  const toggleButtonStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 24,
    left: 12,
    zIndex: 1000,
    padding: '6px 12px',
    background: '#f59e0b',
    border: '2px solid #d97706',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '12px',
    color: '#78350f',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  };

  const popupStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 60,
    left: 12,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    background: 'rgba(255,255,255,0.95)',
    border: '1px solid #d97706',
    borderRadius: '8px',
    padding: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  };

  const baseButtonStyle: React.CSSProperties = {
    padding: '6px 14px',
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
    <>
      <button
        style={toggleButtonStyle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Toggle Dev Mode"
      >
        🛠 Dev Mode
      </button>

      {open && (
        <div style={popupStyle} aria-label="Dev Mode toolbar">
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
            <span style={{ fontSize: '12px', color: '#78350f', fontStyle: 'italic', textAlign: 'center' }}>
              Click the map to place…
            </span>
          )}
        </div>
      )}
    </>
  );
}
