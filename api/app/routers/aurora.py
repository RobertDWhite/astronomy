"""Aurora visibility for the observer's latitude.

Translates SWPC Kp index forecast into a plain-English chance of seeing
aurora from this specific location. Lower latitudes need higher Kp.
"""
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()

# Approximate Kp threshold required to see aurora at a given geomagnetic latitude.
# Source: NOAA / Wikipedia aurora visibility tables (simplified linear approximation).
def _kp_threshold_for_lat(lat_deg: float) -> float:
    abs_lat = abs(lat_deg)
    if abs_lat >= 67: return 0
    if abs_lat >= 64: return 1
    if abs_lat >= 62: return 2
    if abs_lat >= 60: return 3
    if abs_lat >= 58: return 4
    if abs_lat >= 56: return 5
    if abs_lat >= 54: return 6
    if abs_lat >= 50: return 7
    if abs_lat >= 46: return 8
    return 9  # Effectively unattainable for most US/EU latitudes


def _chance_label(current_kp: float, threshold: float) -> tuple[str, str]:
    if threshold >= 9:
        return ("none", "Aurora is essentially never visible from your latitude.")
    diff = current_kp - threshold
    if diff >= 1.5:
        return ("high", f"Aurora likely overhead — Kp {current_kp:.1f} is well above your threshold of Kp {threshold:.0f}.")
    if diff >= 0:
        return ("moderate", f"Aurora possible low on the northern horizon — Kp {current_kp:.1f} meets your latitude's Kp {threshold:.0f} threshold.")
    if diff >= -1:
        return ("low", f"Aurora unlikely — Kp {current_kp:.1f} is one step below your Kp {threshold:.0f} threshold.")
    return ("none", f"No aurora chance — need Kp {threshold:.0f}+, currently {current_kp:.1f}.")


@router.get("/aurora")
async def get_aurora(request: Request):
    cache = request.app.state.caches["aurora"]
    if "data" in cache:
        return cache["data"]

    lat = float(settings.OBSERVER_LAT)
    threshold = _kp_threshold_for_lat(lat)

    current_kp = 0.0
    forecast = []
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            # 1-minute Kp for "right now"
            r = await client.get("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json")
            r.raise_for_status()
            data = r.json()
            if data:
                current_kp = float(data[-1].get("estimated_kp") or 0)

            # 3-day forecast
            try:
                r2 = await client.get("https://services.swpc.noaa.gov/text/3-day-forecast.txt")
                r2.raise_for_status()
                lines = r2.text.splitlines()
                # Parse the NOAA 3-day text — best-effort extraction of Kp peaks per day
                in_kp = False
                kp_days = []
                for line in lines:
                    if "Kp index breakdown" in line or "NOAA Geomagnetic" in line:
                        in_kp = True
                        continue
                    if in_kp and "Rationale" in line:
                        break
                    if in_kp:
                        parts = line.split()
                        if len(parts) >= 4 and parts[0].replace(".", "").isdigit() is False:
                            # day-row like "00-03UT   2.67     2.33     2.00"
                            try:
                                nums = [float(p) for p in parts if any(c.isdigit() for c in p) and p.replace(".", "").replace("-", "").isdigit()]
                                if len(nums) >= 3:
                                    kp_days.append(nums[:3])
                            except Exception:
                                pass
                if kp_days:
                    # Per-day max Kp
                    per_day = [max(col) for col in zip(*kp_days)]
                    today = datetime.now(timezone.utc).date()
                    for i, peak_kp in enumerate(per_day):
                        forecast.append({
                            "date": (today + timedelta(days=i)).isoformat(),
                            "peak_kp": round(peak_kp, 1),
                            "chance_at_location": _chance_label(peak_kp, threshold)[0],
                        })
            except Exception:
                pass
    except Exception:
        pass

    chance, message = _chance_label(current_kp, threshold)

    result = {
        "observer_lat": lat,
        "current_kp": round(current_kp, 1),
        "threshold_kp": threshold,
        "chance": chance,
        "message": message,
        "forecast": forecast,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    cache["data"] = result
    return result
