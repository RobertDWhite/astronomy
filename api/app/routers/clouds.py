"""Cloud cover forecast at the observer's location via Open-Meteo (no API key)."""
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


@router.get("/clouds")
async def get_clouds(request: Request):
    cache = request.app.state.caches["clouds"]
    if "data" in cache:
        return cache["data"]

    lat = settings.OBSERVER_LAT
    lon = settings.OBSERVER_LON

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "cloud_cover,visibility,temperature_2m,precipitation_probability",
                    "forecast_days": 3,
                    "timezone": "UTC",
                },
            )
            r.raise_for_status()
            raw = r.json()

        hourly = raw.get("hourly", {})
        times = hourly.get("time", [])
        clouds = hourly.get("cloud_cover", [])
        vis = hourly.get("visibility", [])
        temp = hourly.get("temperature_2m", [])
        precip = hourly.get("precipitation_probability", [])

        rows = []
        for i, t in enumerate(times[:72]):
            rows.append({
                "time": t + ("Z" if not t.endswith("Z") else ""),
                "cloud_cover_pct": clouds[i] if i < len(clouds) else None,
                "visibility_m": vis[i] if i < len(vis) else None,
                "temp_c": temp[i] if i < len(temp) else None,
                "precip_chance_pct": precip[i] if i < len(precip) else None,
            })

        # Find the best window in next 72h: lowest cloud cover, daylight or night doesn't matter here
        now = datetime.now(timezone.utc)
        best = None
        for row in rows:
            try:
                t = datetime.fromisoformat(row["time"].replace("Z", "+00:00"))
            except Exception:
                continue
            if t < now:
                continue
            cc = row["cloud_cover_pct"]
            if cc is None:
                continue
            if best is None or cc < best["cloud_cover_pct"]:
                best = row

        result = {
            "hourly": rows,
            "best_window": best,
            "lat": lat,
            "lon": lon,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        result = {"hourly": [], "best_window": None, "error": str(e)}

    cache["data"] = result
    return result
