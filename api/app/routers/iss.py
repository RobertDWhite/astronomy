import asyncio
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Request

router = APIRouter()

_OPEN_NOTIFY_POS = "http://api.open-notify.org/iss-now.json"
_WHERETHEISS_POS = "https://api.wheretheiss.at/v1/satellites/25544"
_OPEN_NOTIFY_CREW = "http://api.open-notify.org/astros.json"


@router.get("/iss")
async def get_iss(request: Request):
    cache = request.app.state.caches["iss"]
    if "data" in cache:
        return cache["data"]

    position = None
    crew = None

    async with httpx.AsyncClient(timeout=8) as client:
        # Position: try open-notify first, fall back to wheretheiss.at
        try:
            pos_resp = await client.get(_OPEN_NOTIFY_POS)
            pos_resp.raise_for_status()
            pos = pos_resp.json()
            position = {
                "latitude": float(pos["iss_position"]["latitude"]),
                "longitude": float(pos["iss_position"]["longitude"]),
                "altitude": 408.0,
                "velocity": 7.66,
                "timestamp": pos.get("timestamp", 0),
            }
        except Exception:
            try:
                alt_resp = await client.get(_WHERETHEISS_POS)
                alt_resp.raise_for_status()
                alt = alt_resp.json()
                position = {
                    "latitude": float(alt["latitude"]),
                    "longitude": float(alt["longitude"]),
                    "altitude": round(float(alt.get("altitude", 408.0)), 1),
                    "velocity": round(float(alt.get("velocity", 27600)) / 3600, 2),
                    "timestamp": int(alt.get("timestamp", 0)),
                }
            except Exception:
                pass

        # Crew
        try:
            crew_resp = await client.get(_OPEN_NOTIFY_CREW)
            crew_resp.raise_for_status()
            crew_raw = crew_resp.json()
            fetched = [
                {"name": p["name"], "craft": p["craft"]}
                for p in crew_raw.get("people", [])
            ]
            if fetched:
                crew = fetched
                request.app.state.iss_last_crew = fetched
        except Exception:
            pass

    # Fill in from stale state if live fetch failed
    if position is None:
        last = getattr(request.app.state, "iss_last_good", None)
        if last:
            return last
        position = {"latitude": 0.0, "longitude": 0.0, "altitude": 408.0, "velocity": 7.66, "timestamp": 0}

    if crew is None:
        crew = getattr(request.app.state, "iss_last_crew", [])

    result = {
        "position": position,
        "crew": crew,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    cache["data"] = result
    request.app.state.iss_last_good = result
    return result
