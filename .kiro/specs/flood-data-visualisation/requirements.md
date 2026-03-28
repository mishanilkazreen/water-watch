# Requirements Document

## Introduction

Water Watch is a real-time UK flood monitoring web application. This document covers the full MVP feature set: live flood data fetching and map visualisation, user hazard reporting, safe routing around flood zones, and an emergency services mode. The app is built with Mapbox GL JS today and is planned for migration to React + Vite; requirements are written to be framework-agnostic unless a specific integration point is called out.

---

## Glossary

- **App**: The Water Watch — UK Flood Monitor single-page web application.
- **EA_API**: The UK Environment Agency Real-Time Flood Monitoring API (`https://environment.data.gov.uk/flood-monitoring/id/floods`).
- **Flood_Warning**: A single active flood warning item returned by the EA_API, carrying a `severityLevel` integer (1 = Severe, 2 = Flood Warning, 3 = Flood Alert, 4 = No Longer in Force) and a `severity` human-readable string.
- **Flood_Zone**: The GeoJSON polygon or MultiPolygon geometry associated with a Flood_Warning.
- **Map**: The Mapbox GL JS map instance rendered in the App.
- **Data_Layer**: A Mapbox GL JS source + fill + outline layer pair representing Flood_Zones on the Map.
- **Severity_Colour**: The fill colour assigned to a Flood_Zone based on its `severityLevel` (1 → `#c0392b`, 2 → `#e67e22`, 3 → `#f1c40f`, 4 → `#7f8c8d`).
- **Popup**: A Mapbox GL JS popup overlay showing details for a clicked Flood_Zone.
- **Report**: A user-submitted hazard report containing a location, type, and optional description.
- **Report_API**: The FastAPI backend endpoint (`POST /reports`, `GET /reports`) that stores and serves Reports.
- **Buffer_Zone**: A Turf.js-buffered polygon around a Flood_Zone used to widen the avoidance area for routing.
- **ORS**: OpenRouteService API v2, used to calculate a driving route that avoids Buffer_Zones.
- **Route**: A GeoJSON LineString returned by ORS representing a safe driving path.
- **Emergency_Mode**: An optional operational mode toggled in the App header that enables shelter placement and high-risk zone marking.
- **Shelter**: A point of interest placed on the Map by an operator in Emergency_Mode.
- **High_Risk_Zone**: A manually marked polygon on the Map by an operator in Emergency_Mode.
- **Poller**: The client-side interval timer that periodically re-fetches data from the EA_API and Report_API.

---

## Requirements

### Requirement 1: Live Flood Data Fetching

**User Story:** As a member of the public, I want the app to fetch live flood warnings from the Environment Agency, so that I can see up-to-date flood information without refreshing the page.

#### Acceptance Criteria

1. WHEN the App initialises, THE App SHALL fetch all active Flood_Warnings from the EA_API.
2. WHEN the EA_API returns a successful response, THE App SHALL parse the `items` array and treat each entry as a Flood_Warning.
3. WHEN a Flood_Warning contains a `floodArea.polygon` URL, THE App SHALL fetch the corresponding GeoJSON geometry from that URL.
4. WHEN the GeoJSON response is a FeatureCollection, THE App SHALL extract the first Feature as the Flood_Zone geometry.
5. WHEN mapping EA_API response fields to internal properties, THE App SHALL assign `severityLevel` from the integer field `severityLevel` and `severity` from the string field `severity` (not swapped).
6. IF the EA_API request fails, THEN THE App SHALL display an error message in the status indicator and retain any previously loaded data.
7. IF a polygon URL request fails or returns no geometry, THEN THE App SHALL skip that Flood_Warning and continue loading the remaining warnings.
8. WHEN the Poller interval elapses (every 60 seconds), THE App SHALL re-fetch all active Flood_Warnings and update the Data_Layer without a full page reload.
9. WHEN a re-fetch completes successfully, THE App SHALL update the status indicator to show the count of active Flood_Warnings and the timestamp of the last successful fetch.

---

### Requirement 2: Map Visualisation of Flood Zones

**User Story:** As a member of the public, I want flood zones displayed on the map with colour-coded severity, so that I can quickly understand which areas are most at risk.

#### Acceptance Criteria

1. WHEN Flood_Zone data is loaded, THE Map SHALL render each Flood_Zone as a filled polygon using the corresponding Severity_Colour at 45% opacity.
2. WHEN Flood_Zone data is loaded, THE Map SHALL render an outline for each Flood_Zone using the corresponding Severity_Colour at 80% opacity and 1.5px line width.
3. THE Map SHALL use `severityLevel` (integer 1–4) as the data-driven paint property for Severity_Colour, not the human-readable `severity` string.
4. WHEN the Data_Layer is updated by the Poller, THE Map SHALL replace the existing source data without removing and re-adding the layers.
5. THE Map SHALL display a legend identifying the four severity levels and their corresponding Severity_Colours.
6. WHEN the user's viewport contains no active Flood_Zones, THE App SHALL display a status message indicating no active warnings in the current view.

---

### Requirement 3: Flood Zone Click Popup

**User Story:** As a member of the public, I want to click a flood zone to see its details, so that I can understand the specific risk and affected area.

#### Acceptance Criteria

1. WHEN a user clicks on a Flood_Zone polygon, THE Map SHALL display a Popup at the click location.
2. THE Popup SHALL show the flood area description, the human-readable severity string, the river or sea name (if available), and the flood area ID.
3. THE Popup SHALL apply a CSS class corresponding to the `severityLevel` (e.g. `sev-1` through `sev-4`) to the severity badge element.
4. WHEN the cursor enters a Flood_Zone polygon, THE Map SHALL change the cursor style to `pointer`.
5. WHEN the cursor leaves a Flood_Zone polygon, THE Map SHALL restore the cursor style to the default.
6. WHEN a Popup is open and the user clicks elsewhere on the Map, THE Map SHALL close the Popup.

---

### Requirement 4: User Hazard Reporting

**User Story:** As a member of the public, I want to report a hazard I can see on the ground, so that other users and emergency services are aware of localised dangers.

#### Acceptance Criteria

1. THE App SHALL display a floating "Report Hazard" button visible at all times on the Map.
2. WHEN the user clicks the "Report Hazard" button, THE App SHALL open a modal form.
3. THE modal form SHALL include fields for hazard type (dropdown), location (map pin or coordinates), and an optional free-text description (maximum 280 characters).
4. WHEN the user submits the form with valid data, THE App SHALL send a `POST /reports` request to the Report_API with the hazard type, coordinates, and description.
5. IF the `POST /reports` request fails, THEN THE App SHALL display an inline error message within the modal and keep the modal open.
6. WHEN the `POST /reports` request succeeds, THE App SHALL close the modal and display a confirmation message for 3 seconds.
7. THE Poller SHALL fetch `GET /reports` every 10 seconds and render all returned Reports as markers on the Map.
8. WHEN a Report marker is clicked, THE Map SHALL display a Popup showing the hazard type, description, and submission timestamp.
9. IF the Report_API is unreachable, THEN THE App SHALL continue operating and display a non-blocking warning that user reports are temporarily unavailable.

---

### Requirement 5: Safe Routing Around Flood Zones

**User Story:** As a driver, I want to get a safe driving route that avoids active flood zones, so that I can navigate without entering flooded areas.

#### Acceptance Criteria

1. THE App SHALL display a "Get me out" button on the Map.
2. WHEN the user clicks "Get me out", THE App SHALL request the user's current location using the browser Geolocation API.
3. WHEN a current location is obtained, THE App SHALL prompt the user to select or enter a destination.
4. WHEN a destination is provided, THE App SHALL apply Turf.js `buffer` to each active Flood_Zone polygon with a radius of 200 metres to produce Buffer_Zones.
5. WHEN Buffer_Zones are computed, THE App SHALL send a routing request to ORS with the origin, destination, and the union of all Buffer_Zones as the `avoid_polygons` parameter.
6. WHEN ORS returns a valid Route, THE Map SHALL render the Route as a GeoJSON LineString layer in a distinct colour (e.g. `#3ecf8e`).
7. IF ORS cannot find a route that avoids all Buffer_Zones, THEN THE App SHALL display a message informing the user that no safe route was found and suggest contacting emergency services.
8. IF the browser Geolocation API is unavailable or the user denies permission, THEN THE App SHALL display an error message and allow the user to enter their location manually.
9. WHEN a new Route is calculated, THE Map SHALL remove any previously rendered Route before rendering the new one.
10. WHEN a Route is rendered, THE Map SHALL fit the viewport to the bounding box of the Route with appropriate padding.

---

### Requirement 6: Emergency Services Mode

**User Story:** As an emergency services operator, I want a dedicated mode that lets me place shelters and mark high-risk zones on the map, so that I can coordinate a response and communicate risk to the public.

#### Acceptance Criteria

1. THE App header SHALL contain a toggle labelled "Emergency Services Mode".
2. WHEN Emergency_Mode is activated, THE App SHALL display a distinct visual indicator (e.g. a coloured header border) to differentiate the operator view from the public view.
3. WHILE Emergency_Mode is active, THE App SHALL display a "Place Shelter" tool that allows the operator to click a map location to add a Shelter marker.
4. WHEN a Shelter is placed, THE Map SHALL render a distinct Shelter marker icon at the selected location.
5. WHILE Emergency_Mode is active, THE App SHALL display a "Mark High-Risk Zone" tool that allows the operator to draw a polygon on the Map.
6. WHEN a High_Risk_Zone polygon is completed, THE Map SHALL render it with a distinct fill colour (e.g. `#8e44ad` at 40% opacity) and outline.
7. WHEN Emergency_Mode is deactivated, THE App SHALL hide the operator tools but SHALL retain all placed Shelters and High_Risk_Zones on the Map for the current session.
8. WHEN a Shelter marker is clicked, THE Map SHALL display a Popup allowing the operator to add or edit a label for that Shelter.

---

### Requirement 7: React + Vite Migration Compatibility

**User Story:** As a developer, I want the app's data-fetching and state logic to be structured so that it can be migrated to React + Vite without a full rewrite, so that the MVP can evolve into a maintainable production app.

#### Acceptance Criteria

1. THE App SHALL isolate all EA_API and Report_API data-fetching logic in dedicated modules (e.g. `src/api/floodApi.js`, `src/api/reportApi.js`) with no direct DOM manipulation.
2. THE App SHALL isolate all Mapbox GL JS map initialisation and layer management in a dedicated module (e.g. `src/map/mapManager.js`) separate from business logic.
3. THE App SHALL manage Poller intervals in a single location so they can be replaced with React `useEffect` cleanup hooks during migration.
4. WHERE the React migration is complete, THE App SHALL use React component state to drive all map data updates rather than direct source mutation.

---

### Requirement 8: Mobile Viewport Support

**User Story:** As a mobile user, I want the app to be usable on a small screen, so that I can check flood warnings and get routing directions while on the move.

#### Acceptance Criteria

1. THE App SHALL render correctly on viewports with a minimum width of 375px.
2. THE App SHALL use `100dvh` for the full-height layout to account for mobile browser chrome.
3. WHEN displayed on a viewport narrower than 600px, THE App SHALL position the legend, "Report Hazard" button, and "Get me out" button so they do not overlap the Map controls.
4. WHEN displayed on a viewport narrower than 600px, THE Popup SHALL have a maximum width of 90vw.
