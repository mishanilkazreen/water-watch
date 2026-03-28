import mapboxgl, { GeoJSONSource } from 'mapbox-gl';
import { Feature, FeatureCollection } from 'geojson';
import { Report } from '../api/reportApi';

// Module-level state
let map: mapboxgl.Map | null = null;
let floodLayersAdded = false;
let reportMarkers: mapboxgl.Marker[] = [];
let shelterCounter = 0;
let zoneCounter = 0;

// Severity colour match expression for Mapbox paint
const severityMatchExpression: mapboxgl.Expression = [
  'match',
  ['get', 'severityLevel'],
  1, '#c0392b',
  2, '#e67e22',
  3, '#f1c40f',
  4, '#7f8c8d',
  '#7f8c8d', // default
];

/**
 * Task 7.1 — Initialise the Mapbox GL JS map.
 */
export function init(containerId: string, token: string): mapboxgl.Map {
  mapboxgl.accessToken = token;

  map = new mapboxgl.Map({
    container: containerId,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-1.5, 53.0],
    zoom: 6,
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  return map;
}

/**
 * Task 7.2 — Upsert flood zone GeoJSON source and layers.
 */
export function setFloodData(geojson: FeatureCollection): void {
  if (!map) return;

  if (floodLayersAdded) {
    (map.getSource('flood-zones') as GeoJSONSource).setData(geojson);
    return;
  }

  map.addSource('flood-zones', {
    type: 'geojson',
    data: geojson,
  });

  map.addLayer({
    id: 'flood-fill',
    type: 'fill',
    source: 'flood-zones',
    paint: {
      'fill-color': severityMatchExpression,
      'fill-opacity': 0.45,
    },
  });

  map.addLayer({
    id: 'flood-outline',
    type: 'line',
    source: 'flood-zones',
    paint: {
      'line-color': severityMatchExpression,
      'line-opacity': 0.8,
      'line-width': 1.5,
    },
  });

  map.on('mouseenter', 'flood-fill', () => {
    if (map) map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'flood-fill', () => {
    if (map) map.getCanvas().style.cursor = '';
  });

  floodLayersAdded = true;
}

/**
 * Task 7.3 — Render one marker per report with a click popup.
 */
export function setReportMarkers(reports: Report[]): void {
  if (!map) return;

  // Clear existing markers
  reportMarkers.forEach((m) => m.remove());
  reportMarkers = [];

  reports.forEach((report) => {
    const marker = new mapboxgl.Marker({ color: '#e74c3c' })
      .setLngLat([report.coordinates[0], report.coordinates[1]])
      .addTo(map!);

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div class="report-popup">
        <strong>${report.hazardType}</strong>
        ${report.description ? `<p>${report.description}</p>` : ''}
        <small>${new Date(report.createdAt).toLocaleString()}</small>
      </div>
    `);

    marker.setPopup(popup);
    marker.getElement().addEventListener('click', () => popup.addTo(map!));

    reportMarkers.push(marker);
  });
}

/**
 * Task 7.4 — Render, replace, or clear the route LineString layer.
 */
export function setRoute(geojson: Feature | null): void {
  if (!map) return;

  const sourceId = 'route';
  const layerId = 'route-line';

  if (geojson === null) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    return;
  }

  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as GeoJSONSource).setData(geojson);
  } else {
    map.addSource(sourceId, { type: 'geojson', data: geojson });
    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#3ecf8e',
        'line-width': 4,
      },
    });
  }

  // Fit bounds to route geometry
  if (geojson.geometry.type === 'LineString') {
    const coords = geojson.geometry.coordinates as [number, number][];
    if (coords.length > 0) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 60 });
    }
  }
}

/**
 * Task 7.5 — Add a shelter marker at the given lngLat; returns a unique ID.
 */
export function addShelter(lngLat: [number, number]): string {
  if (!map) return '';

  const id = `shelter-${++shelterCounter}`;

  const el = document.createElement('div');
  el.className = 'shelter-marker';
  el.style.cssText =
    'font-size:24px;cursor:pointer;user-select:none;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));';
  el.textContent = '🏠';
  el.title = 'Shelter';

  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat(lngLat)
    .addTo(map);

  const popup = new mapboxgl.Popup({ offset: 25 });

  el.addEventListener('click', () => {
    const label = window.prompt('Edit shelter label:', id) ?? id;
    popup.setHTML(`<div class="shelter-popup"><strong>${label}</strong></div>`).addTo(map!);
    marker.setPopup(popup);
  });

  return id;
}

/**
 * Task 7.5 — Add a high-risk zone polygon layer; returns a unique zone ID.
 */
export function addHighRiskZone(polygon: Feature): string {
  if (!map) return '';

  const id = `high-risk-zone-${++zoneCounter}`;
  const fillLayerId = id;
  const outlineLayerId = `${id}-outline`;

  map.addSource(id, { type: 'geojson', data: polygon });

  map.addLayer({
    id: fillLayerId,
    type: 'fill',
    source: id,
    paint: {
      'fill-color': '#8e44ad',
      'fill-opacity': 0.4,
    },
  });

  map.addLayer({
    id: outlineLayerId,
    type: 'line',
    source: id,
    paint: {
      'line-color': '#8e44ad',
      'line-width': 2,
    },
  });

  return id;
}

/**
 * Expose the current map instance (useful for tests and components).
 */
export function getMap(): mapboxgl.Map | null {
  return map;
}

/**
 * Reset module state — used in tests.
 */
export function _reset(): void {
  map = null;
  floodLayersAdded = false;
  reportMarkers = [];
  shelterCounter = 0;
  zoneCounter = 0;
}
