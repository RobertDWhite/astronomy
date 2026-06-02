"""'Should I look up tonight?' — the headline card.

Computes tonight's sun/twilight/moon timing for the observer, plus a single
plain-English verdict about the best stargazing window.
"""
import math
from datetime import datetime, timezone, timedelta

import ephem
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


def _make_observer(horizon: str = "0") -> ephem.Observer:
    obs = ephem.Observer()
    obs.lat = settings.OBSERVER_LAT
    obs.lon = settings.OBSERVER_LON
    obs.elevation = settings.OBSERVER_ELEV
    obs.horizon = horizon
    obs.pressure = 0
    return obs


def _iso(d) -> str | None:
    if d is None:
        return None
    return ephem.Date(d).datetime().replace(tzinfo=timezone.utc).isoformat()


def _next_event(obs, body, kind: str, horizon: str = "0"):
    obs.horizon = horizon
    try:
        if kind == "rise":
            return obs.next_rising(body, use_center=True)
        return obs.next_setting(body, use_center=True)
    except (ephem.AlwaysUpError, ephem.NeverUpError):
        return None


def _verdict(moon_illum: float, dark_minutes: int) -> str:
    if dark_minutes < 30:
        return "Sky barely gets dark tonight — skip serious viewing."
    if moon_illum >= 80:
        if dark_minutes >= 120:
            return "Bright moon washes out faint stars, but planets and the Moon itself are spectacular."
        return "Bright moon and short dark window — best for moon-watching tonight."
    if moon_illum >= 40:
        return f"Partial moonlight — bright objects fine, faint deep-sky targets dim. {dark_minutes // 60}h dark window."
    return f"Dark sky, good conditions — {dark_minutes // 60}h {dark_minutes % 60}m of true darkness."


@router.get("/tonight")
async def get_tonight(request: Request):
    cache = request.app.state.caches["tonight"]
    if "data" in cache:
        return cache["data"]

    try:
        now = ephem.now()
        obs = _make_observer()
        obs.date = now

        sun = ephem.Sun()
        moon = ephem.Moon()
        moon.compute(obs)
        moon_illum = float(moon.phase)

        sunset = _next_event(obs, sun, "set", "0")
        sunrise = _next_event(obs, sun, "rise", "0")
        # Astronomical twilight ends at sun -18°, civil at -6°, nautical at -12°
        twilight_civil_end = _next_event(obs, sun, "set", "-6")
        twilight_nautical_end = _next_event(obs, sun, "set", "-12")
        twilight_astro_end = _next_event(obs, sun, "set", "-18")
        # Morning twilight begins (sun rising past those horizons)
        twilight_astro_start = _next_event(obs, sun, "rise", "-18")

        moonrise = _next_event(obs, moon, "rise", "0")
        moonset = _next_event(obs, moon, "set", "0")

        # Compute the dark window: astronomical twilight end -> next astro twilight start (or sunrise)
        dark_start = twilight_astro_end
        dark_end = twilight_astro_start
        dark_minutes = 0
        if dark_start and dark_end:
            dark_minutes = max(0, int((float(dark_end) - float(dark_start)) * 24 * 60))

        # If moon is up during the dark window, knock that off the "good" window
        good_window_start = dark_start
        good_window_end = dark_end
        moon_overlap_minutes = 0
        if dark_start and dark_end and moonrise and moonset:
            # We have a moon rise/set in the next 24h. Compute overlap.
            mr = float(moonrise)
            ms = float(moonset)
            ds = float(dark_start)
            de = float(dark_end)
            # Normalize: figure out if moon is up at dark_start
            obs_at_start = _make_observer()
            obs_at_start.date = dark_start
            mtest = ephem.Moon()
            mtest.compute(obs_at_start)
            moon_up_at_start = float(mtest.alt) > 0
            if moon_up_at_start:
                # Moon is up at dark_start; it will set sometime during the dark window
                if ms > ds and ms < de:
                    moon_overlap_minutes = int((ms - ds) * 24 * 60)
                    good_window_start = moonset
                elif ms >= de:
                    moon_overlap_minutes = dark_minutes
            else:
                # Moon rises during the dark window
                if mr > ds and mr < de:
                    moon_overlap_minutes = int((de - mr) * 24 * 60)
                    good_window_end = moonrise

        good_window_minutes = max(0, dark_minutes - moon_overlap_minutes)


        gc = ephem.FixedBody()
        gc._ra = (17 + 45.6/60) * ephem.hour
        gc._dec = -(28 + 56/60) * ephem.degree
        gc._epoch = ephem.J2000
        gc.compute(obs)
        gc_alt_deg = math.degrees(float(gc.alt))
        gc_az_deg = math.degrees(float(gc.az))
        result = {
            "now": datetime.now(timezone.utc).isoformat(),
            "sunset": _iso(sunset),
            "sunrise": _iso(sunrise),
            "civil_twilight_end": _iso(twilight_civil_end),
            "nautical_twilight_end": _iso(twilight_nautical_end),
            "astro_twilight_end": _iso(twilight_astro_end),
            "astro_twilight_start": _iso(twilight_astro_start),
            "moonrise": _iso(moonrise),
            "moonset": _iso(moonset),
            "moon_illumination": round(moon_illum, 1),
            "dark_window_start": _iso(dark_start),
            "dark_window_end": _iso(dark_end),
            "dark_minutes": dark_minutes,
            "good_window_start": _iso(good_window_start),
            "good_window_end": _iso(good_window_end),
            "good_window_minutes": good_window_minutes,
            "verdict": _verdict(moon_illum, good_window_minutes),
            "observer_lat": float(settings.OBSERVER_LAT),
            "observer_lon": float(settings.OBSERVER_LON),
            "galactic_center_alt_deg": round(gc_alt_deg, 1),
            "galactic_center_az_deg": round(gc_az_deg, 1),
        }
    except Exception as e:
        result = {"error": str(e), "verdict": "Unable to compute tonight's conditions."}

    cache["data"] = result
    return result
