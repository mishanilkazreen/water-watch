# Implementation Plan: Water Watch — UK Flood Monitor

## Overview

Incremental build from a React + Vite scaffold through data fetching, map visualisation, hazard reporting, safe routing, and emergency services mode. Each task builds on the previous; all code is wired together before the next phase begins.

## Tasks

- [x] 1. Scaffold React + Vite project and module structure
  - Initialise a Vite project with the React + TypeScript template
  - Create the directory structure: `src/api/`, `src/map/`, `src/services/`, `src/components/`, `src/utils/`
  - Install dependencies: `mapbox-gl`, `@turf/buffer`, `@turf/union`, `fast-check`, `vitest`
  - Configure Vitest in `vite.config.ts`
  - Copy `.env.example` values; wire `VITE_MAPBOX_TOKEN` into the app entry point
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Implement `src/utils/severityColor.ts` and popup renderer
  - [x] 2.1 Implement `severityColor(level: number): string` returning the correct hex for levels 1–4
    - Export a pure function with no side effects
    - _Requirements: 2.3_

  - [ ]* 2.2 Write property test for `severityColor` (Property 5)
    - **Property 5: Severity level drives colour mapping**
    - **Validates: Requirements 2.3**
    - Tag: `// Feature: flood-data-visualisation, Property 5`

  - [x] 2.3 Implement `src/utils/popupRenderer.ts` — `renderFloodPopupHTML(props): string`
    - Produce HTML with description, severity badge (`sev-{severityLevel}` class), riverOrSea, floodAreaID
    - _Requirements: 3.2, 3.3_

  - [ ]* 2.4 Write property test for popup renderer (Property 6)
    - **Property 6: Popup renders all required fields with correct severity class**
    - **Validates: Requirements 3.2, 3.3**
    - Tag: `// Feature: flood-data-visualisation, Property 6`

- [x] 3. Implement `src/api/floodApi.ts`
  - [x] 3.1 Migrate `fetchFloodWarnings` and `fetchFloodPolygon` from `mockData.js`; add typed `FloodApiError`
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [x] 3.2 Fix the `severityLevel`/`severity` field swap in `fetchFloodPolygons` normalisation
    - `severityLevel` must be assigned from the integer field; `severity` from the string field
    - _Requirements: 1.5_

  - [ ]* 3.3 Write property test for EA API response parsing (Property 1)
    - **Property 1: EA API response parsing preserves all items**
    - **Validates: Requirements 1.2**
    - Tag: `// Feature: flood-data-visualisation, Property 1`

  - [ ]* 3.4 Write property test for polygon URL filtering (Property 2)
    - **Property 2: Only warnings with polygon URLs trigger a polygon fetch**
    - **Validates: Requirements 1.3**
    - Tag: `// Feature: flood-data-visualisation, Property 2`

  - [ ]* 3.5 Write property test for flood warning normalisation (Property 3)
    - **Property 3: Flood warning normalisation correctness**
    - **Validates: Requirements 1.4, 1.5**
    - Tag: `// Feature: flood-data-visualisation, Property 3`

  - [ ]* 3.6 Write property test for failed polygon fetch skipping (Property 4)
    - **Property 4: Failed polygon fetches are skipped without halting**
    - **Validates: Requirements 1.7**
    - Tag: `// Feature: flood-data-visualisation, Property 4`

  - [ ]* 3.7 Write unit tests for `floodApi.ts` error paths
    - EA API 4xx/5xx → `FloodApiError` thrown; status indicator retains previous data
    - FeatureCollection with zero features → result skipped
    - _Requirements: 1.6, 1.7_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `src/api/reportApi.ts`
  - [x] 5.1 Implement `postReport(payload: ReportPayload): Promise<void>` and `getReports(): Promise<Report[]>`; add typed `ReportApiError`
    - _Requirements: 4.4, 4.5, 4.9_

  - [ ]* 5.2 Write property test for report POST payload completeness (Property 8)
    - **Property 8: Report POST payload completeness**
    - **Validates: Requirements 4.4**
    - Tag: `// Feature: flood-data-visualisation, Property 8`

  - [ ]* 5.3 Write property test for all fetched reports rendered as markers (Property 9)
    - **Property 9: All fetched reports are rendered as markers**
    - **Validates: Requirements 4.7**
    - Tag: `// Feature: flood-data-visualisation, Property 9`

  - [ ]* 5.4 Write property test for report popup fields (Property 10)
    - **Property 10: Report popup contains all required fields**
    - **Validates: Requirements 4.8**
    - Tag: `// Feature: flood-data-visualisation, Property 10`

  - [ ]* 5.5 Write unit tests for `reportApi.ts` error paths
    - `POST /reports` failure → `ReportApiError`; `GET /reports` failure → non-blocking warning
    - _Requirements: 4.5, 4.9_

- [x] 6. Implement FastAPI backend (`main.py`) with SQLite reports table
  - [x] 6.1 Define the `reports` SQLite table and wire `POST /reports` endpoint
    - Accept `hazardType`, `coordinates [lng, lat]`, optional `description`; generate `id` (UUID) and `createdAt`
    - _Requirements: 4.4_

  - [x] 6.2 Implement `GET /reports` endpoint returning all stored reports
    - _Requirements: 4.7_

- [x] 7. Implement `src/map/mapManager.ts`
  - [x] 7.1 Implement `init(containerId, token): Map` — create Mapbox GL JS map with dark style, NavigationControl
    - _Requirements: 2.1, 2.2_

  - [x] 7.2 Implement `setFloodData(geojson: FeatureCollection): void`
    - Upsert source via `getSource().setData()`; add fill + outline layers on first call using `severityColor` paint expressions driven by `severityLevel`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 7.3 Implement `setReportMarkers(reports: Report[]): void` — render one marker per report; attach popup on click
    - _Requirements: 4.7, 4.8_

  - [x] 7.4 Implement `setRoute(geojson: Feature | null): void` — render/replace/clear route LineString layer in `#3ecf8e`
    - _Requirements: 5.6, 5.9, 5.10_

  - [x] 7.5 Implement `addShelter(lngLat): string` and `addHighRiskZone(polygon): string`
    - Shelter: distinct marker icon; High-Risk Zone: `#8e44ad` fill at 40% opacity with outline
    - _Requirements: 6.4, 6.6_

  - [ ]* 7.6 Write property test for single route layer invariant (Property 13)
    - **Property 13: Only one route layer exists at a time**
    - **Validates: Requirements 5.9**
    - Tag: `// Feature: flood-data-visualisation, Property 13`

  - [ ]* 7.7 Write property test for shelter placement (Property 14)
    - **Property 14: Shelter placement creates a marker at the correct location**
    - **Validates: Requirements 6.4**
    - Tag: `// Feature: flood-data-visualisation, Property 14`

  - [ ]* 7.8 Write property test for high-risk zone fill colour and opacity (Property 15)
    - **Property 15: High-risk zone uses correct fill colour and opacity**
    - **Validates: Requirements 6.6**
    - Tag: `// Feature: flood-data-visualisation, Property 15`

  - [ ]* 7.9 Write property test for emergency mode deactivation retention (Property 16)
    - **Property 16: Emergency mode deactivation retains shelters and high-risk zones**
    - **Validates: Requirements 6.7**
    - Tag: `// Feature: flood-data-visualisation, Property 16`

  - [ ]* 7.10 Write unit tests for `mapManager.ts`
    - `setFloodData` calls `setData()` not `removeLayer`/`addLayer` on subsequent calls
    - Flood fill/outline paint expressions reference `severityLevel` integer property
    - _Requirements: 2.3, 2.4_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement `src/services/routingService.ts`
  - [x] 9.1 Implement `computeSafeRoute(origin, destination, floodFeatures): Promise<Feature>`
    - Buffer each flood feature 200 m with `@turf/buffer`; union all buffers; POST to ORS `driving-car/geojson` with `avoid_polygons`; throw `RouteNotFoundError` if no route returned
    - _Requirements: 5.4, 5.5, 5.7_

  - [ ]* 9.2 Write property test for buffer containment (Property 11)
    - **Property 11: Buffer zones contain original flood zone polygons**
    - **Validates: Requirements 5.4**
    - Tag: `// Feature: flood-data-visualisation, Property 11`

  - [ ]* 9.3 Write property test for ORS request includes all avoid polygons (Property 12)
    - **Property 12: ORS routing request includes all avoid polygons**
    - **Validates: Requirements 5.5**
    - Tag: `// Feature: flood-data-visualisation, Property 12`

  - [ ]* 9.4 Write unit tests for `routingService.ts` error paths
    - ORS returns no route → `RouteNotFoundError`; network failure → same error with retry note
    - Geolocation denied → `GeolocationError`
    - _Requirements: 5.7, 5.8_

- [x] 10. Implement `src/services/poller.ts`
  - Implement `startFloodPoller(onData, intervalMs = 60000): () => void` and `startReportPoller(onData, intervalMs = 10000): () => void`
  - Each returns a `clearInterval` cleanup function compatible with React `useEffect`
  - _Requirements: 1.8, 1.9, 4.7, 7.3_

- [x] 11. Build React components
  - [x] 11.1 Implement `<App>` — global state (flood features, reports, route, emergency mode); wire pollers via `useEffect`; pass data to `<MapView>`
    - _Requirements: 7.3, 7.4_

  - [x] 11.2 Implement `<Header>` — title, status indicator (count + last-fetch timestamp), Emergency Mode toggle with visual indicator
    - _Requirements: 1.9, 6.1, 6.2_

  - [x] 11.3 Implement `<MapView>` — mounts `mapManager.init`; calls `setFloodData`, `setReportMarkers`, `setRoute` when props change; attaches click popup handlers
    - _Requirements: 2.1, 2.4, 3.1, 3.4, 3.5, 3.6_

  - [x] 11.4 Implement `<Legend>` — four severity rows with colour swatches
    - _Requirements: 2.5_

  - [x] 11.5 Implement `<ReportHazardButton>` — floating button + modal form (hazard type dropdown, map-pin location, description textarea with 280-char limit); calls `postReport`; shows inline error or 3-second confirmation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 11.6 Write property test for report description length validation (Property 7)
    - **Property 7: Report description length validation**
    - **Validates: Requirements 4.3**
    - Tag: `// Feature: flood-data-visualisation, Property 7`

  - [x] 11.7 Implement `<GetMeOutButton>` — floating button; requests Geolocation; prompts for destination; calls `computeSafeRoute`; passes route to `<MapView>`; handles `RouteNotFoundError` and `GeolocationError`
    - _Requirements: 5.1, 5.2, 5.3, 5.7, 5.8_

  - [x] 11.8 Implement `<EmergencyToolbar>` — "Place Shelter" and "Mark High-Risk Zone" tools; visible only in Emergency Mode; calls `mapManager.addShelter` / `addHighRiskZone`; hides on mode deactivation but retains placed items
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Mobile viewport support
  - Set root layout to `100dvh` flex column
  - Add CSS media query for `max-width: 599px`: reposition legend, "Report Hazard" button, and "Get me out" button to avoid overlapping map controls; set popup `max-width: 90vw`
  - Verify minimum 375px viewport renders without overflow
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 14. Wire everything together and migrate from `index.html` prototype
  - Replace `index.html` inline script with the React entry point (`src/main.tsx`)
  - Remove `mockData.js` import; all data flows through `floodApi.ts` and `reportApi.ts`
  - Confirm `VITE_MAPBOX_TOKEN` and `VITE_ORS_API_KEY` are read from `.env`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations and must be tagged with the property number
- Unit tests cover happy paths, edge cases, and typed error conditions
- The FastAPI backend (`main.py`) already exists; tasks extend it rather than replace it
