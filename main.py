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
