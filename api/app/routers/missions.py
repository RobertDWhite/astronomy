"""'Right now in space' — distances and status of headline robotic missions."""
import math
from datetime import datetime, timezone

from fastapi import APIRouter, Request

router = APIRouter()

# Reference distances (km) at a fixed epoch + radial velocity (km/yr).
# Updated linearly client-side from the timestamp; close enough for "wow" use.
# Sources: NASA Voyager mission status / JPL Horizons summary tables.
_REFERENCE_EPOCH = datetime(2026, 1, 1, tzinfo=timezone.utc)

_MISSIONS = [
    {
        "id": "voyager1",
        "name": "Voyager 1",
        "agency": "NASA",
        "status": "Operating in interstellar space.",
        "launched": "1977-09-05",
        "distance_km_at_ref": 24_900_000_000,
        "speed_kms": 16.92,
        "blurb": "The farthest human-made object. Crossed into interstellar space in 2012.",
    },
    {
        "id": "voyager2",
        "name": "Voyager 2",
        "agency": "NASA",
        "status": "Operating in interstellar space.",
        "launched": "1977-08-20",
        "distance_km_at_ref": 20_700_000_000,
        "speed_kms": 15.36,
        "blurb": "The only spacecraft to have visited all four giant planets. Crossed into interstellar space in 2018.",
    },
    {
        "id": "jwst",
        "name": "James Webb Space Telescope",
        "agency": "NASA / ESA / CSA",
        "status": "At Sun-Earth L2 point, ~1.5 million km from Earth.",
        "launched": "2021-12-25",
        "distance_km_at_ref": 1_500_000,
        "speed_kms": 0.0,
        "blurb": "The most powerful space telescope ever launched. Observes the universe in infrared.",
    },
    {
        "id": "parker",
        "name": "Parker Solar Probe",
        "agency": "NASA",
        "status": "Orbiting the Sun; closest approach 6.16 million km.",
        "launched": "2018-08-12",
        "distance_km_at_ref": 70_000_000,
        "speed_kms": 0.0,
        "blurb": "The fastest human-made object — exceeded 192 km/s near the Sun. Touches the Sun's outer atmosphere.",
    },
    {
        "id": "newhorizons",
        "name": "New Horizons",
        "agency": "NASA",
        "status": "Heliocentric; past Pluto; exploring the Kuiper Belt.",
        "launched": "2006-01-19",
        "distance_km_at_ref": 8_600_000_000,
        "speed_kms": 13.78,
        "blurb": "Flew past Pluto in 2015; now exploring the outer Solar System.",
    },
    {
        "id": "perseverance",
        "name": "Perseverance Rover",
        "agency": "NASA",
        "status": "Active in Jezero Crater, Mars.",
        "launched": "2020-07-30",
        "distance_km_at_ref": 240_000_000,
        "speed_kms": 0.0,
        "blurb": "Caching samples for future return to Earth. Carries the Ingenuity helicopter (retired 2024).",
    },
]


def _light_delay_seconds(distance_km: float) -> float:
    return distance_km / 299_792.458


def _format_light_delay(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f} sec"
    minutes, secs = divmod(seconds, 60)
    if minutes < 60:
        return f"{int(minutes)} min {int(secs)} sec"
    hours, mins = divmod(minutes, 60)
    if hours < 24:
        return f"{int(hours)}h {int(mins)}m"
    days, hours = divmod(hours, 24)
    return f"{int(days)}d {int(hours)}h"


@router.get("/missions")
async def get_missions(request: Request):
    cache = request.app.state.caches["missions"]
    if "data" in cache:
        return cache["data"]

    now = datetime.now(timezone.utc)
    secs_since_epoch = (now - _REFERENCE_EPOCH).total_seconds()
    out = []
    for m in _MISSIONS:
        d_km = m["distance_km_at_ref"] + m["speed_kms"] * secs_since_epoch
        ld = _light_delay_seconds(d_km)
        out.append({
            "id": m["id"],
            "name": m["name"],
            "agency": m["agency"],
            "status": m["status"],
            "launched": m["launched"],
            "distance_km": round(d_km),
            "distance_au": round(d_km / 149_597_870.7, 4),
            "light_delay_seconds": round(ld, 1),
            "light_delay_human": _format_light_delay(ld),
            "speed_kms": m["speed_kms"],
            "blurb": m["blurb"],
        })

    result = {"missions": out, "timestamp": now.isoformat()}
    cache["data"] = result
    return result
