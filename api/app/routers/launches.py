"""Upcoming launches with a 'maybe visible from observer' annotation for
eastbound Florida and Wallops launches viewable across much of the eastern US.
"""
import httpx
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


_EASTBOUND_PADS = (
    "florida",      # Kennedy / CCSFS
    "cape canaveral",
    "kennedy",
    "wallops",
    "ksc",
    "ccsfs",
    "ccafs",
)


def _viewable_from_observer(location: str, pad: str, lat: float, lon: float) -> tuple[bool, str | None]:
    """Heuristic: launches from eastbound Florida/Wallops corridors are visible
    across much of the eastern US in the first 3-5 minutes after liftoff.

    Returns (viewable, note). Note explains the conditions.
    """
    text = f"{location} {pad}".lower()
    is_eastbound_us = any(needle in text for needle in _EASTBOUND_PADS)
    if not is_eastbound_us:
        return False, None
    # Within ~1500 km of Cape Canaveral (~28.5N, -80.6W) gives a viewing chance
    cape_lat, cape_lon = 28.5, -80.6
    dlat = lat - cape_lat
    dlon = lon - cape_lon
    # rough degrees-to-km
    dist_km = ((dlat * 111) ** 2 + (dlon * 111 * 0.85) ** 2) ** 0.5
    if dist_km > 1500:
        return False, None
    if dist_km < 200:
        return True, "Within 200 km of pad — visible from horizon if skies are clear."
    return True, f"Approximately {int(dist_km)} km from pad — look low on the eastern horizon shortly after liftoff."


@router.get("/launches")
async def get_launches(request: Request):
    cache = request.app.state.caches["launches"]
    if "data" in cache:
        return cache["data"]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://ll.thespacedevs.com/2.2.0/launch/upcoming/",
                params={"limit": 8, "format": "json"},
            )
            resp.raise_for_status()
            raw = resp.json()
    except Exception:
        return {"launches": []}

    obs_lat = float(settings.OBSERVER_LAT)
    obs_lon = float(settings.OBSERVER_LON)

    launches = []
    for item in raw.get("results", []):
        mission = item.get("mission") or {}
        provider = item.get("launch_service_provider") or {}
        status = item.get("status") or {}
        pad = item.get("pad") or {}
        location = pad.get("location") or {}
        vid_urls = [v.get("url") for v in (item.get("vidURLs") or []) if isinstance(v, dict) and v.get("url")]
        info_urls = [v.get("url") for v in (item.get("infoURLs") or []) if isinstance(v, dict) and v.get("url")]
        launch_url = (vid_urls + info_urls + [item.get("url")])[0] if (vid_urls or info_urls or item.get("url")) else None

        viewable, view_note = _viewable_from_observer(location.get("name") or "", pad.get("name") or "", obs_lat, obs_lon)

        launches.append({
            "id": item.get("id", ""),
            "name": item.get("name"),
            "provider": provider.get("name"),
            "vehicle": (item.get("rocket") or {}).get("configuration", {}).get("name"),
            "pad": pad.get("name"),
            "location": location.get("name"),
            "net": item.get("net"),
            "status": status.get("name"),
            "mission_description": mission.get("description"),
            "image_url": item.get("image"),
            "url": launch_url,
            "viewable_from_observer": viewable,
            "viewable_note": view_note,
        })

    result = {"launches": launches}
    cache["data"] = result
    return result
