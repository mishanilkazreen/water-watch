import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Feature, FeatureCollection } from 'geojson';
import type { FloodPolygonResult } from '../api/floodApi';
import type { Report } from '../api/reportApi';
import * as mapManager from '../map/mapManager';
import { renderFloodPopupHTML } from '../utils/popupRenderer';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface MapViewProps {
  floodFeatures: FloodPolygonResult[];
  reports: Report[];
  route: Feature | null;
  emergencyMode: boolean;
  onRouteChange: (route: Feature | null) => void;
}

export default function MapView({ floodFeatures, reports, route }: MapViewProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const floodClickHandlerRef = useRef<((e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => void) | null>(null);

  // Mount: initialise map
  useEffect(() => {
    const map = mapManager.init('map-container', MAPBOX_TOKEN);
    mapRef.current = map;
  }, []);

  // floodFeatures change: update source + attach click popup handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const featureCollection: FeatureCollection = {
      type: 'FeatureCollection',
      features: floodFeatures.map((r) => r.feature),
    };

    const applyFloodData = () => {
      mapManager.setFloodData(featureCollection);

      // Remove previous click handler before attaching a new one
      if (floodClickHandlerRef.current) {
        map.off('click', 'flood-fill', floodClickHandlerRef.current);
      }

      const handler = (
        e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }
      ) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const props = feature.properties as {
          description?: string;
          severity?: string;
          riverOrSea?: string;
          floodAreaID?: string;
          severityLevel?: number;
        };

        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            renderFloodPopupHTML({
              description: props.description ?? '',
              severity: props.severity ?? '',
              riverOrSea: props.riverOrSea,
              floodAreaID: props.floodAreaID ?? '',
              severityLevel: props.severityLevel ?? 4,
            })
          )
          .addTo(map);
      };

      map.on('click', 'flood-fill', handler);
      floodClickHandlerRef.current = handler;
    };

    if (map.isStyleLoaded()) {
      applyFloodData();
    } else {
      map.once('load', applyFloodData);
    }
  }, [floodFeatures]);

  // reports change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => mapManager.setReportMarkers(reports);

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('load', apply);
    }
  }, [reports]);

  // route change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => mapManager.setRoute(route);

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('load', apply);
    }
  }, [route]);

  return <div id="map-container" style={{ width: '100%', flex: 1 }} />;
}
