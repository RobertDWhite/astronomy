import math
from datetime import datetime, timezone

import ephem
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


def _make_observer() -> ephem.Observer:
    obs = ephem.Observer()
    obs.lat = settings.OBSERVER_LAT
    obs.lon = settings.OBSERVER_LON
    obs.elevation = settings.OBSERVER_ELEV
    obs.pressure = 0
    return obs


_PLANET_CONFIG = [
    ("Mercury", ephem.Mercury, "#9ca3af", 2.5),
    ("Venus",   ephem.Venus,   "#e8cda0", 3.5),
    ("Mars",    ephem.Mars,    "#ef4444", 3.0),
    ("Jupiter", ephem.Jupiter, "#d97706", 7.0),
    ("Saturn",  ephem.Saturn,  "#e8d191", 6.0),
    ("Uranus",  ephem.Uranus,  "#67e8f9", 4.5),
    ("Neptune", ephem.Neptune, "#818cf8", 4.5),
    ("Pluto",   ephem.Pluto,   "#c8a882", 2.0),
]

_DWARF_PLANET_ELEMENTS = [
    {
        "name": "Ceres", "color": "#a89070", "size": 1.8,
        "a": 2.7675, "e": 0.0784, "inc": 10.594,
        "Om": 80.401, "om": 73.561, "M": 123.0, "epoch_M": "2026/4/18",
    },
    {
        "name": "Haumea", "color": "#c8b89a", "size": 1.6,
        "a": 43.116, "e": 0.18874, "inc": 28.193,
        "Om": 121.900, "om": 238.90, "M": 218.0, "epoch_M": "2026/4/18",
    },
    {
        "name": "Makemake", "color": "#c87040", "size": 1.6,
        "a": 45.791, "e": 0.15922, "inc": 28.984,
        "Om": 79.590, "om": 294.83, "M": 351.0, "epoch_M": "2026/4/18",
    },
    {
        "name": "Eris", "color": "#dde8f0", "size": 2.0,
        "a": 67.780, "e": 0.44177, "inc": 44.040,
        "Om": 35.880, "om": 151.50, "M": 202.0, "epoch_M": "2026/4/18",
    },
]


def _make_elliptical_body(cfg: dict) -> ephem.EllipticalBody:
    b = ephem.EllipticalBody()
    b.name = cfg["name"]
    b._a = cfg["a"]
    b._e = cfg["e"]
    b._inc = cfg["inc"]
    b._Om = cfg["Om"]
    b._om = cfg["om"]
    b._M = cfg["M"]
    b._epoch_M = ephem.Date(cfg["epoch_M"])
    b._epoch = ephem.Date("2000/1/1.5")
    return b


@router.get("/solar-system")
async def get_solar_system(request: Request):
    cache = request.app.state.caches["solar_system"]
    if "data" in cache:
        return cache["data"]

    obs = _make_observer()
    obs.date = ephem.now()

    bodies = []

    # Earth: derive from Sun's geocentric ecliptic longitude
    sun = ephem.Sun()
    sun.compute(obs)
    sun_ecl = ephem.Ecliptic(sun, epoch=ephem.now())
    earth_hlong = float(sun_ecl.lon) + math.pi
    earth_dist = float(sun.earth_distance)
    bodies.append({
        "name": "Earth",
        "distance_au": round(earth_dist, 4),
        "hlong_deg": round(math.degrees(earth_hlong) % 360, 2),
        "x": round(earth_dist * math.cos(earth_hlong), 4),
        "y": round(earth_dist * math.sin(earth_hlong), 4),
        "color": "#4fa3e0",
        "size": 4.0,
        "orbit_au": 1.0,
        "is_dwarf": False,
    })

    for name, cls, color, size in _PLANET_CONFIG:
        try:
            body = cls()
            body.compute(obs)
            hlong = float(body.hlong)
            dist = float(body.sun_distance)
            bodies.append({
                "name": name,
                "distance_au": round(dist, 4),
                "hlong_deg": round(math.degrees(hlong) % 360, 2),
                "x": round(dist * math.cos(hlong), 4),
                "y": round(dist * math.sin(hlong), 4),
                "color": color,
                "size": size,
                "orbit_au": round(float(body.a), 3) if hasattr(body, 'a') else round(dist, 3),
                "is_dwarf": name == "Pluto",
            })
        except Exception:
            pass

    for cfg in _DWARF_PLANET_ELEMENTS:
        try:
            body = _make_elliptical_body(cfg)
            body.compute(obs)
            hlong = float(body.hlong)
            dist = float(body.sun_distance)
            bodies.append({
                "name": cfg["name"],
                "distance_au": round(dist, 4),
                "hlong_deg": round(math.degrees(hlong) % 360, 2),
                "x": round(dist * math.cos(hlong), 4),
                "y": round(dist * math.sin(hlong), 4),
                "color": cfg["color"],
                "size": cfg["size"],
                "orbit_au": cfg["a"],
                "is_dwarf": True,
            })
        except Exception:
            pass

    bodies.sort(key=lambda b: b["distance_au"])

    result = {
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "bodies": bodies,
    }
    cache["data"] = result
    return result
