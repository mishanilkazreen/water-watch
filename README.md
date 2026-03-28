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
MAPBOX_TOKEN=pk.eyJ1...        # your Mapbox public token
ORS_API_KEY=5b3ce3597...       # your OpenRouteService key
```

Then open `index.html` and replace `YOUR_MAPBOX_TOKEN_HERE` with your token (or wire it up via Vite's `import.meta.env` if you're on the React branch).

---

## Project Structure

```
water-watch/
├── index.html          # Mapbox map (Phase 1 static version)
├── mockData.js         # Live flood data from Environment Agency API
├── .env.example        # Token template — copy to .env
├── main.py             # PyCharm placeholder (ignore)
├── src/                # React + Vite frontend (Phase 2+)
│   └── ...
└── backend/            # FastAPI backend (Phase 2+)
    ├── main.py
    ├── models.py
    └── database.py
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Map Rendering | Mapbox GL JS |
| Routing Engine | OpenRouteService API v2 (`avoid_polygons`) |
| Polygon Buffering | Turf.js (`@turf/buffer`) — client-side |
| Frontend | React + Vite |
| Backend | FastAPI (Python) — auto-docs at `/docs` |
| Database | SQLite — zero config |
| Flood Data | UK Environment Agency API — no key needed |
| Hosting / Demo | Ngrok or Railway |

---

## Frontend Setup

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install mapbox-gl @turf/buffer @turf/helpers axios
```

Add your Mapbox token to the Vite env file:

```bash
# frontend/.env
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

Access it in code as `import.meta.env.VITE_MAPBOX_TOKEN`.

Start dev server:

```bash
npm run dev
```

---

## Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install fastapi uvicorn pydantic
```

Run the server:

```bash
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/reports` | List all active reports |
| `POST` | `/reports` | Submit a new hazard report |
| `POST` | `/reports/{id}/confirm` | Increment `confirmed_count` |
| `GET` | `/shelters` | List all shelters |
| `POST` | `/shelters` | Emergency services: add a shelter |

---

## Data Models

**Report** (user or emergency services):
```
id: uuid
lat: float
lng: float
type: enum[flood, blocked_road, fire, structural]
severity: int  # 1–3
confirmed_count: int
source: enum[user, emergency_services]
timestamp: datetime
```

**Shelter** (emergency services only):
```
id: uuid
lat: float
lng: float
name: str
is_medical: bool
added_by: enum[emergency_services]
```

---

## Routing Logic

1. User taps **"Get me out"** → browser geolocation gives current lat/lng
2. Fetch active reports: `GET /reports`
3. Buffer each report point into an avoidance polygon: `turf.buffer(point, severity * 0.15km)`
4. Call ORS Directions with `avoid_polygons` (GeoJSON MultiPolygon)
5. Render returned GeoJSON LineString as a Mapbox GL JS layer

> Validate GeoJSON with `turf.isObject()` before sending to ORS. Log the raw request in console during dev.

---

## Build Phases

| Phase | Window | Goal |
|---|---|---|
| **1** | 0 – 1.5h | Static map + mock data. Mapbox renders. Live flood polygons from Environment Agency API. 2 hardcoded shelters. No backend. |
| **2** | 1.5 – 3h | User reporting. Report modal (type + severity). `POST /reports`. Map polls `GET /reports` every 10s. Marker opacity scales with `confirmed_count`. |
| **3** | 3 – 4.5h | Safe routing. "Get me out" button. Turf.js buffers. ORS called with `avoid_polygons`. Route polyline rendered. Left panel shows nearby shelters. |
| **4** | 4.5 – 5.5h | Emergency services mode. Header toggle (no auth). ES can place shelters and mark high-risk zones (bypasses threshold). |
| **5** | 5.5 – 6h | Polish + demo prep. Mobile viewport check. Script the demo path end to end. |

---

## Division of Labour

| Person | Owns |
|---|---|
| **A — Frontend** | Mapbox map rendering, report UI modal, route polyline display, shelter markers |
| **B — Backend** | FastAPI setup, SQLite data model, all API endpoints |
| **C — Integration** | Frontend ↔ backend wiring, Turf.js buffering, ORS API call, mock data, demo script |

---

## Risks & Mitigations

| Risk | Fix |
|---|---|
| ORS rejects malformed GeoJSON | Validate with `turf.isObject()` before sending. Log raw request. |
| No WebSocket for live updates | Poll `GET /reports` every 10s — fine for demo scale. |
| What3Words integration | Stub: `getW3W(lat, lng)` returns `'mock.word.here'`. Mention verbally in pitch. |
| Multi-user confirmation threshold | `confirmed_count >= 3` = full opacity marker. Hardcoded, don't overthink it. |