const SEVERITY_ROWS = [
  { level: 1, label: 'Severe', color: '#c0392b' },
  { level: 2, label: 'Flood Warning', color: '#e67e22' },
  { level: 3, label: 'Flood Alert', color: '#f1c40f' },
  { level: 4, label: 'No Longer in Force', color: '#7f8c8d' },
];

export default function Legend() {
  return (
    <div
      className="legend"
      style={{
        position: 'absolute',
        bottom: 24,
        left: 12,
        background: 'rgba(255,255,255,0.92)',
        borderRadius: 6,
        padding: '8px 12px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        zIndex: 1000,
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      {SEVERITY_ROWS.map(({ level, label, color }) => (
        <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              borderRadius: 2,
              background: color,
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#222' }}>
            Level {level} — {label}
          </span>
        </div>
      ))}
    </div>
  );
}
