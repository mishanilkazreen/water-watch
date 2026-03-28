export interface FloodPopupProps {
  description: string;
  severity: string;
  riverOrSea?: string;
  floodAreaID: string;
  severityLevel: number;
}

export function renderFloodPopupHTML(props: FloodPopupProps): string {
  const { description, severity, riverOrSea, floodAreaID, severityLevel } = props;

  const riverOrSeaRow = riverOrSea
    ? `<p class="popup-river"><strong>River / Sea:</strong> ${riverOrSea}</p>`
    : '';

  return `
<div class="flood-popup">
  <p class="popup-description">${description}</p>
  <span class="severity-badge sev-${severityLevel}">${severity}</span>
  ${riverOrSeaRow}
  <p class="popup-area-id"><strong>Flood Area ID:</strong> ${floodAreaID}</p>
</div>
`.trim();
}
