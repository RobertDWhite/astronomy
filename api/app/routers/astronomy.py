import math
from datetime import datetime, timezone, timedelta

import ephem
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


def _make_observer() -> ephem.Observer:
    obs = ephem.Observer()
    obs.lat = settings.OBSERVER_LAT
    obs.lon = settings.OBSERVER_LON
    obs.elevation = settings.OBSERVER_ELEV
    obs.pressure = 0  # disable atmospheric refraction for cleaner results
    return obs


def _ephem_date_to_iso(d) -> str | None:
    if d is None:
        return None
    dt = ephem.Date(d).datetime()
    return dt.replace(tzinfo=timezone.utc).isoformat()


def _phase_name(moon: ephem.Moon) -> str:
    phase = moon.phase  # 0-100 illumination percentage
    # Use nnm and nfm to determine waxing vs waning
    now = ephem.now()
    prev_new = ephem.previous_new_moon(now)
    next_full = ephem.next_full_moon(prev_new)
    next_new = ephem.next_new_moon(prev_new)

    if now < next_full:
        # waxing
        if phase < 2:
            return "New"
        elif phase < 48:
            return "Waxing Crescent"
        elif phase < 52:
            return "First Quarter"
        else:
            return "Waxing Gibbous"
    else:
        # waning
        if phase > 98:
            return "Full"
        elif phase > 52:
            return "Waning Gibbous"
        elif phase > 48:
            return "Last Quarter"
        else:
            return "Waning Crescent"


@router.get("/moon")
async def get_moon(request: Request):
    cache = request.app.state.caches["moon"]
    if "data" in cache:
        return cache["data"]

    try:
        obs = _make_observer()
        now = ephem.now()
        obs.date = now

        moon = ephem.Moon(obs)
        moon.compute(obs)

        illumination = moon.phase  # already 0-100

        prev_new = ephem.previous_new_moon(now)
        age_days = float(now - prev_new)

        next_new = ephem.next_new_moon(now)
        next_full = ephem.next_full_moon(now)
        next_fq = ephem.next_first_quarter_moon(now)
        next_lq = ephem.next_last_quarter_moon(now)

        distance_km = moon.earth_distance * ephem.meters_per_au / 1000

        result = {
            "phase_name": _phase_name(moon),
            "illumination": round(illumination, 2),
            "age_days": round(age_days, 2),
            "distance_km": round(distance_km, 0),
            "next_new_moon": _ephem_date_to_iso(next_new),
            "next_full_moon": _ephem_date_to_iso(next_full),
            "next_first_quarter": _ephem_date_to_iso(next_fq),
            "next_last_quarter": _ephem_date_to_iso(next_lq),
        }
    except Exception:
        result = {
            "phase_name": None,
            "illumination": None,
            "age_days": None,
            "distance_km": None,
            "next_new_moon": None,
            "next_full_moon": None,
            "next_first_quarter": None,
            "next_last_quarter": None,
        }

    cache["data"] = result
    return result


_PLANET_CLASSES = {
    "Sun": ephem.Sun,
    "Moon": ephem.Moon,
    "Mercury": ephem.Mercury,
    "Venus": ephem.Venus,
    "Mars": ephem.Mars,
    "Jupiter": ephem.Jupiter,
    "Saturn": ephem.Saturn,
    "Uranus": ephem.Uranus,
    "Neptune": ephem.Neptune,
    "Pluto": ephem.Pluto,
}

# Dwarf planets lacking native ephem support — approximate orbital elements (J2000 epoch)
_DWARF_PLANET_ELEMENTS = [
    {
        "name": "Ceres",
        "a": 2.7675, "e": 0.0784, "inc": 10.594,
        "Om": 80.401, "om": 73.561,
        "M": 123.0, "epoch_M": "2026/4/18",
        "H": 3.34, "G": 0.12,
    },
    {
        "name": "Haumea",
        "a": 43.116, "e": 0.18874, "inc": 28.193,
        "Om": 121.900, "om": 238.90,
        "M": 218.0, "epoch_M": "2026/4/18",
        "H": 0.10, "G": 0.15,
    },
    {
        "name": "Makemake",
        "a": 45.791, "e": 0.15922, "inc": 28.984,
        "Om": 79.590, "om": 294.83,
        "M": 351.0, "epoch_M": "2026/4/18",
        "H": -0.30, "G": 0.15,
    },
    {
        "name": "Eris",
        "a": 67.780, "e": 0.44177, "inc": 44.040,
        "Om": 35.880, "om": 151.50,
        "M": 202.0, "epoch_M": "2026/4/18",
        "H": -1.10, "G": 0.15,
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
    b._H = cfg["H"]
    b._G = cfg["G"]
    return b


def _compute_planet(name: str, body_cls, obs: ephem.Observer) -> dict:
    body = body_cls()
    body.compute(obs)

    alt_deg = math.degrees(body.alt)
    az_deg = math.degrees(body.az)

    constellation = ephem.constellation(body)[1]

    try:
        magnitude = float(body.mag)
    except Exception:
        magnitude = None

    try:
        rise = obs.next_rising(body_cls())
        rise_iso = _ephem_date_to_iso(rise)
    except Exception:
        rise_iso = None

    try:
        set_ = obs.next_setting(body_cls())
        set_iso = _ephem_date_to_iso(set_)
    except Exception:
        set_iso = None

    return {
        "name": name,
        "constellation": constellation,
        "magnitude": round(magnitude, 2) if magnitude is not None else None,
        "altitude": round(alt_deg, 2),
        "azimuth": round(az_deg, 2),
        "rise_time": rise_iso,
        "set_time": set_iso,
        "distance_au": None,
        "angular_diameter_arcsec": None,
    }


@router.get("/planets")
async def get_planets(request: Request):
    cache = request.app.state.caches["planets"]
    if "data" in cache:
        return cache["data"]

    try:
        obs = _make_observer()
        obs.date = ephem.now()

        planets = []
        for name, cls in _PLANET_CLASSES.items():
            try:
                entry = _compute_planet(name, cls, obs)
                entry["is_dwarf_planet"] = False
                planets.append(entry)
            except Exception:
                planets.append({
                    "name": name,
                    "constellation": None,
                    "magnitude": None,
                    "altitude": None,
                    "azimuth": None,
                    "rise_time": None,
                    "set_time": None,
                    "distance_au": None,
                    "angular_diameter_arcsec": None,
                    "is_dwarf_planet": False,
                })

        for cfg in _DWARF_PLANET_ELEMENTS:
            try:
                body = _make_elliptical_body(cfg)
                body.compute(obs)
                alt_deg = math.degrees(body.alt)
                az_deg = math.degrees(body.az)
                constellation = ephem.constellation(body)[1]
                try:
                    magnitude = float(body.mag)
                except Exception:
                    magnitude = None
                planets.append({
                    "name": cfg["name"],
                    "constellation": constellation,
                    "magnitude": round(magnitude, 1) if magnitude is not None else None,
                    "altitude": round(alt_deg, 2),
                    "azimuth": round(az_deg, 2),
                    "rise_time": None,
                    "set_time": None,
                    "distance_au": None,
                    "angular_diameter_arcsec": None,
                    "is_dwarf_planet": True,
                })
            except Exception:
                pass

        result = {
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "observer_location": f"{settings.OBSERVER_LAT}, {settings.OBSERVER_LON}",
            "planets": planets,
        }
    except Exception:
        result = {
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "observer_location": "",
            "planets": [],
        }

    cache["data"] = result
    return result


_METEOR_SHOWERS = [
    {"name": "Quadrantids",       "month": 1,  "day": 3,  "description": "One of the strongest annual showers. Peak ZHR ~120. Radiant in Boötes."},
    {"name": "Lyrids",            "month": 4,  "day": 21, "description": "Spring shower from Comet Thatcher. Peak ZHR ~18."},
    {"name": "Eta Aquariids",     "month": 5,  "day": 5,  "description": "Debris from Halley's Comet, best from southern hemisphere. Peak ZHR ~50."},
    {"name": "Delta Aquariids",   "month": 7,  "day": 28, "description": "Southern summer shower. Broad peak, steady rates. Peak ZHR ~20."},
    {"name": "Alpha Capricornids","month": 7,  "day": 30, "description": "Slow, bright fireballs. Active late July to mid-August. Peak ZHR ~5."},
    {"name": "Perseids",          "month": 8,  "day": 12, "description": "Most popular shower of the year, from Comet Swift-Tuttle. Peak ZHR ~100."},
    {"name": "Draconids",         "month": 10, "day": 7,  "description": "Slow meteors from Comet 21P/Giacobini-Zinner. Best at dusk. Peak ZHR ~10."},
    {"name": "Orionids",          "month": 10, "day": 21, "description": "Halley's Comet debris. Swift meteors with persistent trains. Peak ZHR ~25."},
    {"name": "Leonids",           "month": 11, "day": 17, "description": "From Comet Tempel-Tuttle. Can produce storms every 33 years. Peak ZHR ~15."},
    {"name": "Geminids",          "month": 12, "day": 13, "description": "Best annual shower, from asteroid 3200 Phaethon. Multicolored. Peak ZHR ~150."},
    {"name": "Ursids",            "month": 12, "day": 22, "description": "Quiet shower coinciding with winter solstice. Radiant near Ursa Minor. Peak ZHR ~10."},
]

# Curated one-off events for 2026–2028
_CURATED_EVENTS = [
    {
        "name": "Total Solar Eclipse",
        "date": "2026-08-12",
        "type": "eclipse",
        "description": "Total solar eclipse crossing Greenland, Iceland, Spain, and Russia. Totality up to 2 min 18 sec.",
        "visibility_lat": (35, 80), "visibility_lon": (-60, 80),
        "local_note_default": "Not visible from North America.",
    },
    {
        "name": "Partial Lunar Eclipse",
        "date": "2026-09-27",
        "type": "eclipse",
        "description": "Partial lunar eclipse visible from Europe, Africa, the Americas, and western Asia.",
        "visibility_lat": (-90, 90), "visibility_lon": (-180, 180),
        "local_note_default": "Partially visible from your location during local night.",
    },
    {
        "name": "Saturn at Opposition",
        "date": "2026-10-04",
        "type": "opposition",
        "description": "Saturn rises at sunset and is visible all night. Best time to observe the rings with a telescope.",
        "visibility_lat": (-90, 90), "visibility_lon": (-180, 180),
        "local_note_default": "Visible worldwide all night.",
    },
    {
        "name": "Annular Solar Eclipse",
        "date": "2027-02-06",
        "type": "eclipse",
        "description": "Ring-of-fire eclipse crossing South America and central Africa.",
        "visibility_lat": (-50, 10), "visibility_lon": (-90, 50),
        "local_note_default": "Not visible from North America.",
    },
    {
        "name": "Jupiter at Opposition",
        "date": "2027-03-11",
        "type": "opposition",
        "description": "Jupiter at closest approach to Earth, shining at magnitude -2.9. All four Galilean moons visible in binoculars.",
        "visibility_lat": (-90, 90), "visibility_lon": (-180, 180),
        "local_note_default": "Visible worldwide all night.",
    },
    {
        "name": "Mars at Opposition",
        "date": "2027-02-19",
        "type": "opposition",
        "description": "Mars at its closest approach to Earth since 2025. Best viewing until 2029.",
        "visibility_lat": (-90, 90), "visibility_lon": (-180, 180),
        "local_note_default": "Visible worldwide all night.",
    },
    {
        "name": "Total Solar Eclipse",
        "date": "2027-08-02",
        "type": "eclipse",
        "description": "Total solar eclipse with up to 6 min 23 sec totality, crossing North Africa and the Arabian Peninsula.",
        "visibility_lat": (10, 45), "visibility_lon": (-20, 60),
        "local_note_default": "Not visible from North America.",
    },
    {
        "name": "Saturn at Opposition",
        "date": "2027-10-18",
        "type": "opposition",
        "description": "Saturn at opposition - rings inclined 5° and closing toward edge-on in 2025.",
        "visibility_lat": (-90, 90), "visibility_lon": (-180, 180),
        "local_note_default": "Visible worldwide all night.",
    },
]


def _next_shower_date(month: int, day: int, from_date: datetime) -> datetime:
    year = from_date.year
    candidate = datetime(year, month, day, 2, 0, 0, tzinfo=timezone.utc)
    if candidate < from_date:
        candidate = datetime(year + 1, month, day, 2, 0, 0, tzinfo=timezone.utc)
    return candidate



def _local_circumstance(ev: dict, lat: float, lon: float) -> dict:
    vlat = ev.get("visibility_lat")
    vlon = ev.get("visibility_lon")
    visible = False
    if vlat and vlon:
        visible = vlat[0] <= lat <= vlat[1] and vlon[0] <= lon <= vlon[1]
    return {
        "visible_from_observer": bool(visible),
        "note": ev.get("local_note_default", ""),
    }


@router.get("/events")
async def get_events(request: Request):
    cache = request.app.state.caches["events"]
    if "data" in cache:
        return cache["data"]

    try:
        now_dt = datetime.now(timezone.utc)
        cutoff = now_dt + timedelta(days=180)
        now_ephem = ephem.now()

        events = []

        # Equinoxes and solstices
        seasonal = [
            ("Vernal Equinox", ephem.next_vernal_equinox(now_ephem), "equinox", "Sun crosses celestial equator heading north."),
            ("Autumnal Equinox", ephem.next_autumnal_equinox(now_ephem), "equinox", "Sun crosses celestial equator heading south."),
            ("Summer Solstice", ephem.next_summer_solstice(now_ephem), "solstice", "Longest day of the year in the northern hemisphere."),
            ("Winter Solstice", ephem.next_winter_solstice(now_ephem), "solstice", "Shortest day of the year in the northern hemisphere."),
        ]
        for name, ephem_date, etype, desc in seasonal:
            dt = ephem.Date(ephem_date).datetime().replace(tzinfo=timezone.utc)
            if now_dt <= dt <= cutoff:
                events.append({
                    "name": name,
                    "date": dt.isoformat(),
                    "type": etype,
                    "description": desc,
                    "days_until": (dt - now_dt).days,
                })

        # Moon phases
        phase_funcs = [
            ("New Moon", ephem.next_new_moon, "moon_phase", "Moon is not visible from Earth."),
            ("Full Moon", ephem.next_full_moon, "moon_phase", "Moon is fully illuminated as seen from Earth."),
            ("First Quarter Moon", ephem.next_first_quarter_moon, "moon_phase", "Moon is half illuminated, waxing."),
            ("Last Quarter Moon", ephem.next_last_quarter_moon, "moon_phase", "Moon is half illuminated, waning."),
        ]
        for name, func, ptype, desc in phase_funcs:
            cursor = now_ephem
            for _ in range(7):
                ephem_date = func(cursor)
                dt = ephem.Date(ephem_date).datetime().replace(tzinfo=timezone.utc)
                if dt > cutoff:
                    break
                events.append({
                    "name": name,
                    "date": dt.date().isoformat(),
                    "type": ptype,
                    "description": desc,
                    "days_until": (dt - now_dt).days,
                })
                cursor = ephem_date + 1

        # Meteor showers (annual, recurring)
        for shower in _METEOR_SHOWERS:
            peak_dt = _next_shower_date(shower["month"], shower["day"], now_dt)
            if peak_dt <= cutoff:
                events.append({
                    "name": f"{shower['name']} Meteor Shower",
                    "date": peak_dt.date().isoformat(),
                    "type": "meteor_shower",
                    "description": shower["description"],
                    "days_until": (peak_dt - now_dt).days,
                })

        # Curated eclipses and planetary events with local visibility for the observer.
        try:
            obs_lat = float(settings.OBSERVER_LAT)
            obs_lon = float(settings.OBSERVER_LON)
        except Exception:
            obs_lat, obs_lon = 0.0, 0.0
        for ev in _CURATED_EVENTS:
            ev_dt = datetime.strptime(ev["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if now_dt <= ev_dt <= cutoff:
                circ = _local_circumstance(ev, obs_lat, obs_lon)
                events.append({
                    "name": ev["name"],
                    "date": ev["date"],
                    "type": ev["type"],
                    "description": ev["description"],
                    "days_until": (ev_dt - now_dt).days,
                    "visible_from_observer": circ["visible_from_observer"],
                    "local_note": circ["note"],
                })

        events.sort(key=lambda e: e["date"])
        result = {"events": events}

    except Exception:
        result = {"events": []}

    cache["data"] = result
    return result
