const SEVERITY_COLOURS: Record<number, string> = {
  1: '#c0392b', // Severe
  2: '#e67e22', // Warning
  3: '#f1c40f', // Alert
  4: '#7f8c8d', // No longer in force
};

const FALLBACK_COLOUR = '#7f8c8d';

export function severityColor(level: number): string {
  return SEVERITY_COLOURS[level] ?? FALLBACK_COLOUR;
}
