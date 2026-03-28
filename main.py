import sqlite3
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = "reports.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id          TEXT PRIMARY KEY,
            hazard_type TEXT NOT NULL,
            lng         REAL NOT NULL,
            lat         REAL NOT NULL,
            description TEXT,
            created_at  TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS dev_hazards (
            id         TEXT PRIMARY KEY,
            lng        REAL NOT NULL,
            lat        REAL NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS dev_shelters (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            lng         REAL NOT NULL,
            lat         REAL NOT NULL,
            type        TEXT NOT NULL DEFAULT 'shelter',
            created_at  TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models ---

class ReportPayload(BaseModel):
    hazardType: str
    coordinates: list[float] = Field(..., min_length=2, max_length=2)
    description: Optional[str] = None


class ReportCreated(BaseModel):
    id: str
    createdAt: str


class Report(BaseModel):
    id: str
    hazardType: str
    coordinates: list[float]
    description: Optional[str]
    createdAt: str


# --- Endpoints ---

@app.post("/reports", response_model=ReportCreated, status_code=201)
def create_report(payload: ReportPayload):
    report_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    lng, lat = payload.coordinates[0], payload.coordinates[1]

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO reports (id, hazard_type, lng, lat, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (report_id, payload.hazardType, lng, lat, payload.description, created_at),
        )
        conn.commit()
    finally:
        conn.close()

    return ReportCreated(id=report_id, createdAt=created_at)


@app.get("/reports", response_model=list[Report])
def list_reports():
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM reports ORDER BY created_at DESC").fetchall()
    finally:
        conn.close()

    return [
        Report(
            id=row["id"],
            hazardType=row["hazard_type"],
            coordinates=[row["lng"], row["lat"]],
            description=row["description"],
            createdAt=row["created_at"],
        )
        for row in rows
    ]


# --- Dev hazards ---

class DevHazardPayload(BaseModel):
    coordinates: list[float] = Field(..., min_length=2, max_length=2)


class DevHazard(BaseModel):
    id: str
    coordinates: list[float]
    createdAt: str


@app.post("/dev/hazards", response_model=DevHazard, status_code=201)
def create_dev_hazard(payload: DevHazardPayload):
    hazard_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    lng, lat = payload.coordinates[0], payload.coordinates[1]
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO dev_hazards (id, lng, lat, created_at) VALUES (?, ?, ?, ?)",
            (hazard_id, lng, lat, created_at),
        )
        conn.commit()
    finally:
        conn.close()
    return DevHazard(id=hazard_id, coordinates=[lng, lat], createdAt=created_at)


@app.get("/dev/hazards", response_model=list[DevHazard])
def list_dev_hazards():
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM dev_hazards ORDER BY created_at ASC").fetchall()
    finally:
        conn.close()
    return [DevHazard(id=r["id"], coordinates=[r["lng"], r["lat"]], createdAt=r["created_at"]) for r in rows]


@app.delete("/dev/hazards", status_code=204)
def clear_dev_hazards():
    conn = get_db()
    try:
        conn.execute("DELETE FROM dev_hazards")
        conn.commit()
    finally:
        conn.close()


# --- Dev shelters ---

class DevShelterPayload(BaseModel):
    id: str
    name: str
    coordinates: list[float] = Field(..., min_length=2, max_length=2)
    type: str = "shelter"


class DevShelter(BaseModel):
    id: str
    name: str
    coordinates: list[float]
    type: str
    createdAt: str


@app.post("/dev/shelters", response_model=DevShelter, status_code=201)
def create_dev_shelter(payload: DevShelterPayload):
    created_at = datetime.now(timezone.utc).isoformat()
    lng, lat = payload.coordinates[0], payload.coordinates[1]
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO dev_shelters (id, name, lng, lat, type, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (payload.id, payload.name, lng, lat, payload.type, created_at),
        )
        conn.commit()
    finally:
        conn.close()
    return DevShelter(id=payload.id, name=payload.name, coordinates=[lng, lat], type=payload.type, createdAt=created_at)


@app.get("/dev/shelters", response_model=list[DevShelter])
def list_dev_shelters():
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM dev_shelters ORDER BY created_at ASC").fetchall()
    finally:
        conn.close()
    return [DevShelter(id=r["id"], name=r["name"], coordinates=[r["lng"], r["lat"]], type=r["type"], createdAt=r["created_at"]) for r in rows]


@app.delete("/dev/shelters", status_code=204)
def clear_dev_shelters():
    conn = get_db()
    try:
        conn.execute("DELETE FROM dev_shelters")
        conn.commit()
    finally:
        conn.close()
