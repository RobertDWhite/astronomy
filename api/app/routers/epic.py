"""Latest EPIC (DSCOVR) full-Earth image from NASA's L1 satellite."""
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


@router.get("/epic")
async def get_epic(request: Request):
    cache = request.app.state.caches["epic"]
    if "data" in cache:
        return cache["data"]

    image = None
    date = None
    caption = None
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(
                "https://api.nasa.gov/EPIC/api/natural/images",
                params={"api_key": settings.NASA_API_KEY},
            )
            r.raise_for_status()
            items = r.json()
            if items:
                latest = items[-1]
                identifier = latest.get("image")
                dt = latest.get("date", "")
                if dt and identifier:
                    yyyy, mm, dd = dt[:4], dt[5:7], dt[8:10]
                    image = f"https://api.nasa.gov/EPIC/archive/natural/{yyyy}/{mm}/{dd}/png/{identifier}.png?api_key={settings.NASA_API_KEY}"
                date = dt
                caption = latest.get("caption")
    except Exception:
        pass

    result = {
        "image_url": image,
        "date": date,
        "caption": caption,
        "source": "DSCOVR EPIC (NASA), Sun-Earth L1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    cache["data"] = result
    return result
