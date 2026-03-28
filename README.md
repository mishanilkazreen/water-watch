# One Piece — Hack Pompey

Real-time disaster navigation app. Users and emergency services report hazards (floods, blocked roads). Reports are buffered into avoidance polygons and fed into a routing engine that calculates the quickest safe evacuation route. Emergency services can declare high-risk zones and place shelters on the map.

---

## API Keys

You need **two** API keys. Both are free tier.

| Service | Where to get it | Limit |
|---|---|---|
| **Mapbox** | [mapbox.com](https://mapbox.com) → Account → Tokens | 50k map loads/month |
| **OpenRouteService** | [openrouteservice.org](https://openrouteservice.org) → Dashboard | 2000 directions req/day |

> **Flood data** is pulled from the [UK Environment Agency Real-Time Flood Monitoring API](https://environment.data.gov.uk/flood-monitoring/id/floods) — no key required.

---

## Environment Setup

Copy `.env.example` and fill in your keys:

```bash
cp .env.example .env
```

`.env`:
```
VITE_MAPBOX_TOKEN=pk.eyJ1...        # your Mapbox public token
VITE_ORS_API_KEY=5b3ce3597...       # your OpenRouteService key
```

---

## Project Structure

```
water-watch/
├── index.html          # HTML entry point
├── main.py             # FastAPI backend (run from root)
├── reports.db          # SQLite database (auto-created)
├── mockData.js         # Legacy flood data reference
├── .env.example        # Token template — copy to .env
├── src/                # React + Vite + TypeScript frontend
│   ├── App.tsx
│   ├── api/            # Axios API clients (reports, flood, dev)
│   ├── components/     # UI components (Map, Header, Panels, Toolbars)
│   ├── data/           # Static shelter data
│   ├── map/            # Mapbox GL JS map manager
│   ├── services/       # Pollers (flood + reports)
│   └── utils/          # Haversine, severity colours, popup renderer
└── vite.config.ts
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Map Rendering | Mapbox GL JS v3 |
| Routing Engine | OpenRouteService API v2 (`avoid_polygons`) |
| Polygon Buffering | Turf.js (`@turf/buffer`, `@turf/union`) — client-side |
| Spatial Utils | `@turf/boolean-point-in-polygon`, `@turf/helpers` |
| Frontend | React 18 + Vite + TypeScript |
| HTTP Client | Axios |
| Backend | FastAPI (Python) — auto-docs at `/docs` |
| Database | SQLite — zero config, file `reports.db` |
| Flood Data | UK Environment Agency API — no key needed |
| Testing | Vitest + fast-check (property-based testing) |

---

## Frontend Setup

```bash
npm install
npm run dev
```

### Frontend Dependencies

**Runtime:**
- `mapbox-gl` — map rendering
- `@turf/buffer` — buffer hazard points into avoidance polygons
- `@turf/union` — merge overlapping polygons
- `@turf/boolean-point-in-polygon` — check if shelters are inside hazard zones
- `@turf/helpers` — GeoJSON helpers
- `axios` — HTTP requests to backend
- `react`, `react-dom` — UI framework

**Dev:**
- `vite`, `@vitejs/plugin-react` — build tooling
- `typescript` — type safety
- `vitest` — test runner
- `fast-check` — property-based testing
- `@types/mapbox-gl`, `@types/react`, `@types/react-dom` — type definitions

---

## Backend Setup

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install fastapi uvicorn pydantic
```

Run the server from the project root:

```bash
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/reports` | List all hazard reports |
| `POST` | `/reports` | Submit a new hazard report |
| `GET` | `/dev/hazards` | List dev-placed hazard points |
| `POST` | `/dev/hazards` | Add a dev hazard point |
| `DELETE` | `/dev/hazards` | Clear all dev hazards |
| `GET` | `/dev/shelters` | List dev-placed shelters |
| `POST` | `/dev/shelters` | Add a dev shelter |
| `DELETE` | `/dev/shelters` | Clear all dev shelters |

---

## Data Models

**Report** (user submitted):
```
id: uuid
hazardType: str        # flood | blocked_road | fire | structural
coordinates: [lng, lat]
description: str (optional)
createdAt: datetime
```

**DevHazard** (dev/demo tool):
```
id: uuid
coordinates: [lng, lat]
createdAt: datetime
```

**DevShelter** (dev/demo tool):
```
id: str
name: str
coordinates: [lng, lat]
type: str              # shelter | medical
createdAt: datetime
```

---

## Routing Logic

1. User taps **"Get me out"** → browser geolocation gives current lat/lng
2. Fetch active reports: `GET /reports`
3. Buffer each report point into an avoidance polygon: `turf.buffer(point, radius)`
4. Merge overlapping polygons with `turf.union`
5. Also include high-risk zones and dev hazards as avoidance areas
6. Call ORS Directions with `avoid_polygons` (GeoJSON MultiPolygon)
7. Render returned GeoJSON LineString as a Mapbox GL JS layer

---

## Build Phases

| Phase | Window | Goal |
|---|---|---|
| **1** | 0 – 1.5h | Static map + mock data. Mapbox renders. Live flood polygons from Environment Agency API. Hardcoded shelters. No backend. |
| **2** | 1.5 – 3h | User reporting. Report modal (type + description). `POST /reports`. Map polls `GET /reports` every 10s. |
| **3** | 3 – 4.5h | Safe routing. "Get me out" button. Turf.js buffers. ORS called with `avoid_polygons`. Route polyline rendered. Shelter panel shows nearby shelters. |
| **4** | 4.5 – 5.5h | Emergency services mode. Header toggle (no auth). ES can place shelters and mark high-risk zones. |
| **5** | 5.5 – 6h | Polish + demo prep. Mobile viewport check. Script the demo path end to end. |

---

## Division of Labour

| Person | Owns |
|---|---|
| **A — Frontend** | Mapbox map rendering, report UI modal, route polyline display, shelter markers |
| **B — Backend** | FastAPI setup, SQLite data model, all API endpoints |
| **C — Integration** | Frontend ↔ backend wiring, Turf.js buffering, ORS API call, flood poller, demo script |

---

## Risks & Mitigations

| Risk | Fix |
|---|---|
| ORS rejects malformed GeoJSON | Validate before sending. Log raw request in console during dev. |
| No WebSocket for live updates | Poll `GET /reports` every 10s — fine for demo scale. |
| What3Words integration | Stub: `getW3W(lat, lng)` returns `'mock.word.here'`. Mention verbally in pitch. |
