import asyncio
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.config import settings

router = APIRouter()


async def fetch_apod_with_retry(max_attempts: int = 5, date: str | None = None) -> dict | None:
    params = {"api_key": settings.NASA_API_KEY}
    if date:
        params["date"] = date
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(max_attempts):
            try:
                resp = await client.get("https://api.nasa.gov/planetary/apod", params=params)
                resp.raise_for_status()
                raw = resp.json()
                return {
                    "date": raw.get("date"),
                    "title": raw.get("title"),
                    "explanation": raw.get("explanation"),
                    "url": raw.get("url"),
                    "hdurl": raw.get("hdurl"),
                    "media_type": raw.get("media_type"),
                    "copyright": raw.get("copyright"),
                }
            except Exception:
                if attempt < max_attempts - 1:
                    await asyncio.sleep(min(2 ** attempt, 30))
    return None


@router.get("/apod")
async def get_apod(request: Request):
    cache = request.app.state.caches["apod"]
    if "data" in cache:
        return cache["data"]

    result = await fetch_apod_with_retry()
    if result is None:
        return JSONResponse(status_code=503, content={"detail": "NASA APOD API unavailable"})

    cache["data"] = result
    return result


@router.get("/apod/week")
async def get_apod_week(request: Request):
    """Return the last 7 days of APODs as thumbnails for a strip."""
    cache = request.app.state.caches["apod_week"]
    if "data" in cache:
        return cache["data"]

    try:
        today = datetime.now(timezone.utc).date()
        start = (today - timedelta(days=6)).isoformat()
        end = today.isoformat()
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(
                "https://api.nasa.gov/planetary/apod",
                params={"api_key": settings.NASA_API_KEY, "start_date": start, "end_date": end},
            )
            r.raise_for_status()
            raw = r.json()
        items = [
            {
                "date": x.get("date"),
                "title": x.get("title"),
                "url": x.get("url"),
                "thumbnail_url": x.get("thumbnail_url"),
                "hdurl": x.get("hdurl"),
                "media_type": x.get("media_type"),
            }
            for x in raw
        ]
        items.sort(key=lambda x: x["date"] or "", reverse=True)
        result = {"days": items}
    except Exception as e:
        result = {"days": [], "error": str(e)}

    cache["data"] = result
    return result
