import { useState, useRef } from 'react';
import { postReport } from '../api/reportApi';

const HAZARD_TYPES = ['Flooding', 'Road Blocked', 'Power Outage', 'Structural Damage', 'Other'];
const MAX_DESC = 280;

export default function ReportHazardButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [hazardType, setHazardType] = useState(HAZARD_TYPES[0]);
  const [lng, setLng] = useState<number | ''>('');
  const [lat, setLat] = useState<number | ''>('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openModal() {
    setHazardType(HAZARD_TYPES[0]);
    setLng('');
    setLat('');
    setDescription('');
    setError(null);
    setLocError(null);
    setModalOpen(true);
    // Auto-fetch location with a 10s timeout
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLng(parseFloat(pos.coords.longitude.toFixed(6)));
          setLat(parseFloat(pos.coords.latitude.toFixed(6)));
          setLocating(false);
        },
        () => {
          setLocError('Could not get your location — enter coordinates manually.');
          setLocating(false);
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    }
  }

  function closeModal() {
    setModalOpen(false);
    setError(null);
    setLocError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.length > MAX_DESC) return;
    if (lng === '' || lat === '') { setError('Location is required.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      await postReport({ hazardType, coordinates: [lng as number, lat as number], description: description || undefined });
      setModalOpen(false);
      setConfirmation(true);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmation(false), 3000);
    } catch {
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const descOver = description.length > MAX_DESC;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: '6px',
    border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box',
  };

  return (
    <>
      <button
        onClick={openModal}
        aria-label="Report a hazard"
        className="btn-report-hazard"
        style={{
          position: 'fixed', bottom: '80px', right: '16px', zIndex: 1000,
          backgroundColor: '#e74c3c', color: '#fff', border: 'none',
          borderRadius: '24px', padding: '12px 20px', fontSize: '14px',
          fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
        }}
      >
        ⚠ Report Hazard
      </button>

      {confirmation && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', bottom: '140px', right: '16px', zIndex: 1100,
          backgroundColor: '#27ae60', color: '#fff', borderRadius: '8px',
          padding: '10px 18px', fontSize: '14px', fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}>
          Report submitted
        </div>
      )}

      {modalOpen && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="report-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
            width: '100%', maxWidth: '420px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 id="report-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Report a Hazard</h2>
              <button onClick={closeModal} aria-label="Close modal" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Hazard type */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="hazard-type" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Hazard Type</label>
                <select id="hazard-type" value={hazardType} onChange={(e) => setHazardType(e.target.value)} required style={inputStyle}>
                  {HAZARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Location — auto-filled from GPS */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Location {locating && <span style={{ fontWeight: 400, color: '#888' }}>(detecting…)</span>}
                </span>
                {locError && <p style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '6px' }}>{locError}</p>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="report-lng" style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px' }}>Longitude</label>
                    <input id="report-lng" type="number" step="any" value={lng} onChange={(e) => setLng(parseFloat(e.target.value))} required placeholder="-1.5" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="report-lat" style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px' }}>Latitude</label>
                    <input id="report-lat" type="number" step="any" value={lat} onChange={(e) => setLat(parseFloat(e.target.value))} required placeholder="53.8" style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="description" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Description <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span>
                </label>
                <textarea
                  id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={3} placeholder="Describe the hazard..."
                  style={{ ...inputStyle, border: `1px solid ${descOver ? '#e74c3c' : '#ccc'}`, resize: 'vertical', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  {descOver && <span style={{ fontSize: '12px', color: '#e74c3c', marginRight: 'auto' }}>Max 280 characters</span>}
                  <span style={{ fontSize: '12px', color: descOver ? '#e74c3c' : '#888' }}>{description.length}/{MAX_DESC}</span>
                </div>
              </div>

              {error && (
                <div role="alert" style={{ backgroundColor: '#fdecea', color: '#c0392b', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeModal} style={{ padding: '9px 18px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={descOver || submitting} style={{
                  padding: '9px 18px', borderRadius: '6px', border: 'none',
                  backgroundColor: descOver || submitting ? '#aaa' : '#e74c3c',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: descOver || submitting ? 'not-allowed' : 'pointer',
                }}>
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
