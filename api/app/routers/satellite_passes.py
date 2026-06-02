"""Visible passes of ISS and Tiangong over the observer's location.

Uses Celestrak TLE data and pyephem to compute next visible passes in the next 5 days.
A "visible" pass means: sun is below horizon at the observer, satellite is above horizon
and sunlit (i.e. not in Earth's shadow).
"""
import math
from datetime import datetime, timezone, timedelta

import ephem
import httpx
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()

_TLE_SOURCES = {
    "ISS":      "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle",
    "Tiangong": "https://celestrak.org/NORAD/elements/gp.php?CATNR=48274&FORMAT=tle",
}


def _direction(az_deg: float) -> str:
    # 16-point compass
    points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
              "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = int((az_deg + 11.25) % 360 / 22.5) % 16
    return points[idx]


def _make_observer():
    obs = ephem.Observer()
    obs.lat = settings.OBSERVER_LAT
    obs.lon = settings.OBSERVER_LON
    obs.elevation = settings.OBSERVER_ELEV
    obs.pressure = 0
    return obs


async def _fetch_tle(client: httpx.AsyncClient, name: str, url: str, cache: dict) -> tuple[str, str] | None:
    if name in cache:
        return cache[name]
    try:
        r = await client.get(url, timeout=12)
        if r.status_code != 200:
            return None
        lines = [ln.strip() for ln in r.text.splitlines() if ln.strip()]
        if len(lines) >= 3:
            # name, line1, line2
            cache[name] = (lines[1], lines[2])
            return cache[name]
        if len(lines) == 2:
            cache[name] = (lines[0], lines[1])
            return cache[name]
    except Exception:
        pass
    return None


def _compute_passes(name: str, line1: str, line2: str, obs: ephem.Observer, days: int = 5) -> list[dict]:
    """Walk forward 5 days and find each visible pass."""
    sat = ephem.readtle(name, line1, line2)
    sun = ephem.Sun()

    passes: list[dict] = []
    start = ephem.now()
    end = start + days

    cursor = start
    safety = 0
    while cursor < end and safety < 200:
        safety += 1
        obs.date = cursor
        try:
            rise_t, rise_az, max_t, max_alt, set_t, set_az = obs.next_pass(sat)
        except Exception:
            break
        if rise_t is None or set_t is None or rise_t > end:
            break
        if rise_t <= cursor:
            cursor = cursor + ephem.minute
            continue

        # Check visibility at max elevation: sun below horizon AND satellite sunlit
        obs.date = max_t
        sun.compute(obs)
        sun_alt = math.degrees(float(sun.alt))
        sat.compute(obs)
        eclipsed = bool(sat.eclipsed)
        peak_alt_deg = math.degrees(float(max_alt))

        is_visible = sun_alt < -6 and peak_alt_deg > 10 and not eclipsed
        # Magnitude estimate: ISS ~ -1 to -4 depending on altitude/range
        # Simplified: -4 + (1 - peak_alt/90) * 3
        approx_mag = -4.0 + (1.0 - peak_alt_deg / 90.0) * 3.0

        # Compute durations
        duration_sec = int((float(set_t) - float(rise_t)) * 86400)

        passes.append({
            "satellite": name,
            "rise_time": ephem.Date(rise_t).datetime().replace(tzinfo=timezone.utc).isoformat(),
            "rise_direction": _direction(math.degrees(float(rise_az))),
            "rise_az_deg": round(math.degrees(float(rise_az)), 1),
            "peak_time": ephem.Date(max_t).datetime().replace(tzinfo=timezone.utc).isoformat(),
            "peak_altitude_deg": round(peak_alt_deg, 1),
            "set_time": ephem.Date(set_t).datetime().replace(tzinfo=timezone.utc).isoformat(),
            "set_direction": _direction(math.degrees(float(set_az))),
            "duration_seconds": duration_sec,
            "is_visible": is_visible,
            "approx_magnitude": round(approx_mag, 1),
        })

        cursor = set_t + (5 * ephem.minute)

    return passes


@router.get("/satellite-passes")
async def get_passes(request: Request):
    cache = request.app.state.caches["passes"]
    if "data" in cache:
        return cache["data"]

    tle_cache = request.app.state.caches["tle"]

    all_passes: list[dict] = []
    try:
        async with httpx.AsyncClient() as client:
            for sat_name, url in _TLE_SOURCES.items():
                tle = await _fetch_tle(client, sat_name, url, tle_cache)
                if not tle:
                    continue
                line1, line2 = tle
                obs = _make_observer()
                obs.date = ephem.now()
                try:
                    sat_passes = _compute_passes(sat_name, line1, line2, obs, days=5)
                    all_passes.extend(sat_passes)
                except Exception:
                    pass

        # Keep only visible passes, sorted by time, top 8
        visible = [p for p in all_passes if p["is_visible"]]
        visible.sort(key=lambda p: p["rise_time"])
        visible = visible[:8]

        result = {"passes": visible, "all_passes": sorted(all_passes, key=lambda p: p["rise_time"])[:20]}
    except Exception as e:
        result = {"passes": [], "all_passes": [], "error": str(e)}

    cache["data"] = result
    return result
