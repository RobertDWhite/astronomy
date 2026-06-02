"""Latest photo from Mars Curiosity / Perseverance."""
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


@router.get("/mars-rover")
async def get_mars_rover(request: Request):
    cache = request.app.state.caches["mars_rover"]
    if "data" in cache:
        return cache["data"]

    photos: list[dict] = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for rover in ("perseverance", "curiosity"):
                try:
                    r = await client.get(
                        f"https://api.nasa.gov/mars-photos/api/v1/rovers/{rover}/latest_photos",
                        params={"api_key": settings.NASA_API_KEY},
                    )
                    if r.status_code != 200:
                        continue
                    items = r.json().get("latest_photos", [])
                    if not items:
                        continue
                    items.sort(key=lambda x: x.get("id", 0), reverse=True)
                    for item in items[:3]:
                        camera = (item.get("camera") or {}).get("full_name") or (item.get("camera") or {}).get("name")
                        photos.append({
                            "rover": rover.title(),
                            "image_url": item.get("img_src", "").replace("http://", "https://"),
                            "earth_date": item.get("earth_date"),
                            "sol": item.get("sol"),
                            "camera": camera,
                        })
                except Exception:
                    continue
    except Exception:
        pass

    result = {
        "photos": photos[:4],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    cache["data"] = result
    return result
