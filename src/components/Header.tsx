interface HeaderProps {
  warningCount: number;
  lastFetch: Date | null;
  emergencyMode: boolean;
  onToggleEmergency: () => void;
  statusError: string | null;
}

export default function Header({
  warningCount,
  lastFetch,
  emergencyMode,
  onToggleEmergency,
  statusError,
}: HeaderProps) {
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 1rem',
    background: emergencyMode ? '#fff3e0' : '#1a1a2e',
    borderBottom: emergencyMode ? '3px solid #e65100' : '3px solid transparent',
    color: emergencyMode ? '#1a1a2e' : '#fff',
    flexShrink: 0,
    gap: '1rem',
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };

  const statusStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    opacity: 0.85,
    color: statusError ? '#e53935' : 'inherit',
  };

  const toggleStyle: React.CSSProperties = {
    padding: '0.35rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: emergencyMode ? '2px solid #e65100' : '2px solid #555',
    borderRadius: '4px',
    background: emergencyMode ? '#e65100' : 'transparent',
    color: emergencyMode ? '#fff' : 'inherit',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  let statusText: string;
  if (statusError) {
    statusText = statusError;
  } else if (lastFetch) {
    const time = lastFetch.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    statusText = `${warningCount} active warning${warningCount !== 1 ? 's' : ''} · Last updated ${time}`;
  } else {
    statusText = 'Loading…';
  }

  return (
    <header style={headerStyle}>
      <h1 style={titleStyle}>Water Watch — UK Flood Monitor</h1>
      <span style={statusStyle}>{statusText}</span>
      <button style={toggleStyle} onClick={onToggleEmergency} aria-pressed={emergencyMode}>
        Emergency Services Mode
      </button>
    </header>
  );
}
