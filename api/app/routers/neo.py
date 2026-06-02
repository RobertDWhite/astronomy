"""Near-Earth Objects with a 'noteworthy' flag for the casual viewer."""
import httpx
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


def _is_noteworthy(obj: dict) -> bool:
    """An object is noteworthy if:
    - It's flagged hazardous OR a sentry object, OR
    - Miss distance < 1.5 lunar distances, OR
    - Estimated max diameter > 100 m
    """
    if obj.get("is_potentially_hazardous"):
        return True
    if obj.get("is_sentry_object"):
        return True
    if (obj.get("miss_distance_lunar") or 99) < 1.5:
        return True
    if (obj.get("diameter_max_km") or 0) > 0.1:
        return True
    return False


def _noteworthy_reason(obj: dict) -> str | None:
    reasons = []
    if obj.get("is_potentially_hazardous"):
        reasons.append("PHA")
    if obj.get("is_sentry_object"):
        reasons.append("Sentry")
    if (obj.get("miss_distance_lunar") or 99) < 1.5:
        reasons.append(f"close pass ({obj['miss_distance_lunar']} lunar dist.)")
    diam_m = (obj.get("diameter_max_km") or 0) * 1000
    if diam_m > 100:
        reasons.append(f"large (~{int(diam_m)} m)")
    return ", ".join(reasons) if reasons else None


@router.get("/neo")
async def get_neo(request: Request):
    cache = request.app.state.caches["neo"]
    if "data" in cache:
        return cache["data"]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.nasa.gov/neo/rest/v1/feed",
                params={"api_key": settings.NASA_API_KEY},
            )
            resp.raise_for_status()
            raw = resp.json()
    except Exception:
        return {"count": 0, "objects": []}

    objects = []
    near_earth_objects = raw.get("near_earth_objects", {})
    for date_str, neos in near_earth_objects.items():
        for neo in neos:
            diameter = neo.get("estimated_diameter", {}).get("meters", {})
            approach_data = neo.get("close_approach_data", [{}])[0]
            miss_distance = approach_data.get("miss_distance", {})
            relative_velocity = approach_data.get("relative_velocity", {})
            diameter_min_m = diameter.get("estimated_diameter_min") or 0
            diameter_max_m = diameter.get("estimated_diameter_max") or 0
            velocity_kmh = float(relative_velocity.get("kilometers_per_hour", 0))
            obj = {
                "id": neo.get("id", ""),
                "name": neo.get("name"),
                "diameter_min_km": round(diameter_min_m / 1000, 4),
                "diameter_max_km": round(diameter_max_m / 1000, 4),
                "miss_distance_km": float(miss_distance.get("kilometers", 0)),
                "miss_distance_lunar": round(float(miss_distance.get("lunar", 0)), 2),
                "miss_distance_au": round(float(miss_distance.get("astronomical", 0)), 4),
                "velocity_km_s": round(velocity_kmh / 3600, 4),
                "velocity_km_h": round(velocity_kmh, 1),
                "approach_date": approach_data.get("close_approach_date"),
                "approach_datetime": approach_data.get("close_approach_date_full", ""),
                "orbiting_body": approach_data.get("orbiting_body", "Earth"),
                "is_potentially_hazardous": neo.get("is_potentially_hazardous_asteroid", False),
                "is_sentry_object": neo.get("is_sentry_object", False),
                "absolute_magnitude": neo.get("absolute_magnitude_h"),
                "nasa_jpl_url": neo.get("nasa_jpl_url"),
            }
            obj["noteworthy"] = _is_noteworthy(obj)
            obj["noteworthy_reason"] = _noteworthy_reason(obj)
            objects.append(obj)

    objects.sort(key=lambda x: x["approach_date"] or "")
    objects = objects[:10]
    noteworthy_count = sum(1 for o in objects if o["noteworthy"])

    result = {"count": len(objects), "noteworthy_count": noteworthy_count, "objects": objects}
    cache["data"] = result
    return result
