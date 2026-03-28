import { useState } from 'react';
import type { Feature } from 'geojson';
import { computeSafeRoute, geocodeAddress, RouteNotFoundError, GeolocationError } from '../services/routingService';
import type { Report } from '../api/reportApi';

interface GetMeOutButtonProps {
  reports: Report[];
  getHighRiskZones: () => Feature[];
  onRouteChange: (route: Feature | null) => void;
}

type Step = 'idle' | 'dest-form' | 'loading';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '6px',
  border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px',
};

export default function GetMeOutButton({ reports, getHighRiskZones, onRouteChange }: GetMeOutButtonProps) {
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  // Origin
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [manualOrigin, setManualOrigin] = useState(false);
  const [originAddress, setOriginAddress] = useState('');

  // Destination
  const [destAddress, setDestAddress] = useState('');

  function reset() {
    setStep('idle');
    setError(null);
    setOrigin(null);
    setManualOrigin(false);
    setOriginAddress('');
    setDestAddress('');
  }

  function handleButtonClick() {
    setError(null);
    setManualOrigin(false);

    if (!navigator.geolocation) {
      setManualOrigin(true);
      setStep('dest-form');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin([pos.coords.longitude, pos.coords.latitude]);
        setStep('dest-form');
      },
      () => {
        setError('Location access denied — enter your postcode or address below.');
        setManualOrigin(true);
        setStep('dest-form');
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep('loading');

    try {
      let resolvedOrigin = origin;

      if (manualOrigin) {
        if (!originAddress.trim()) { setError('Please enter your location.'); setStep('dest-form'); return; }
        resolvedOrigin = await geocodeAddress(originAddress);
      }

      if (!resolvedOrigin) { setError('Origin not available.'); setStep('dest-form'); return; }

      if (!destAddress.trim()) { setError('Please enter a destination.'); setStep('dest-form'); return; }
      const destination = await geocodeAddress(destAddress);

      // Convert hazard reports to GeoJSON point features for avoidance buffering
      const hazardFeatures: Feature[] = reports.map((r) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: r.coordinates },
      }));

      // Also include any high-risk zones drawn by emergency services
      const allAvoidFeatures = [...hazardFeatures, ...getHighRiskZones()];

      const route = await computeSafeRoute(resolvedOrigin, destination, allAvoidFeatures);
      onRouteChange(route);
      reset();
    } catch (err) {
      setStep('dest-form');
      if (err instanceof RouteNotFoundError) {
        setError('No safe route found — please contact emergency services.');
      } else if (err instanceof GeolocationError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  }

  return (
    <>
      <button
        onClick={handleButtonClick}
        aria-label="Get me out"
        disabled={step === 'loading'}
        className="btn-get-me-out"
        style={{
          position: 'fixed', bottom: '16px', right: '16px', zIndex: 1000,
          backgroundColor: '#3ecf8e', color: '#fff', border: 'none',
          borderRadius: '24px', padding: '12px 20px', fontSize: '14px',
          fontWeight: 600, cursor: step === 'loading' ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
        }}
      >
        🚗 Get me out
      </button>

      {(step === 'dest-form' || step === 'loading') && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="getmeout-title"
          onClick={(e) => { if (e.target === e.currentTarget && step !== 'loading') reset(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
            width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 id="getmeout-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Safe Route</h2>
              {step !== 'loading' && (
                <button onClick={reset} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>×</button>
              )}
            </div>

            {error && (
              <div role="alert" style={{ backgroundColor: '#fdecea', color: '#c0392b', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Manual origin — only shown when geolocation failed */}
              {manualOrigin && (
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="origin-address" style={labelStyle}>Your location (postcode or address)</label>
                  <input
                    id="origin-address" type="text" value={originAddress}
                    onChange={(e) => setOriginAddress(e.target.value)}
                    placeholder="e.g. SW1A 1AA or Leeds city centre"
                    style={inputStyle} disabled={step === 'loading'}
                  />
                </div>
              )}

              {/* Destination */}
              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="dest-address" style={labelStyle}>Destination (postcode or address)</label>
                <input
                  id="dest-address" type="text" value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  placeholder="e.g. M1 1AE or Manchester Piccadilly"
                  style={inputStyle} disabled={step === 'loading'} required
                />
                <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                  Enter a UK postcode, town, or address
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {step !== 'loading' && (
                  <button type="button" onClick={reset} style={{ padding: '9px 18px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', fontSize: '14px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={step === 'loading'} style={{
                  padding: '9px 18px', borderRadius: '6px', border: 'none',
                  backgroundColor: step === 'loading' ? '#aaa' : '#3ecf8e',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: step === 'loading' ? 'not-allowed' : 'pointer',
                }}>
                  {step === 'loading' ? 'Finding route…' : 'Get safe route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
