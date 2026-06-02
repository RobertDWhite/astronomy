"""Tonight's featured deep-sky object and constellation for the observer.

Picks a Messier object visible high in the sky tonight from the observer's
location. Also returns a featured seasonal constellation with mythology and
naked-eye tips.
"""
import math
from datetime import datetime, timezone

import ephem
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()

# Curated subset of Messier objects with naked-eye/binocular descriptions.
# RA in hours, Dec in degrees. Magnitude is integrated apparent magnitude.
_MESSIER = [
    {"id": "M31", "name": "Andromeda Galaxy", "ra_h": 0.712, "dec_d": 41.27, "mag": 3.4,
     "type": "galaxy",
     "blurb": "Our nearest large neighbour, 2.5 million light-years away. Visible to the naked eye as a faint smudge near the constellation Andromeda.",
     "tip": "Use averted vision — look slightly away from it to see it more clearly. Binoculars show it as an elongated oval."},
    {"id": "M42", "name": "Orion Nebula", "ra_h": 5.5908, "dec_d": -5.39, "mag": 4.0,
     "type": "nebula",
     "blurb": "A stellar nursery 1,344 light-years away in Orion's sword. Hundreds of stars are forming inside.",
     "tip": "Look just below Orion's belt — even small binoculars reveal cloudy structure around four bright stars (the Trapezium)."},
    {"id": "M45", "name": "Pleiades (Seven Sisters)", "ra_h": 3.7895, "dec_d": 24.105, "mag": 1.6,
     "type": "cluster",
     "blurb": "A young open cluster ~444 light-years away. Six or seven blue-white stars are visible to the naked eye.",
     "tip": "Best in binoculars — dozens more stars and faint blue reflection nebulosity appear."},
    {"id": "M44", "name": "Beehive Cluster", "ra_h": 8.6707, "dec_d": 19.99, "mag": 3.7,
     "type": "cluster",
     "blurb": "An open cluster of ~1,000 stars in Cancer, about 577 light-years away.",
     "tip": "Looks like a hazy patch to the naked eye in a dark sky; binoculars resolve it into dozens of stars."},
    {"id": "M13", "name": "Great Hercules Cluster", "ra_h": 16.6948, "dec_d": 36.46, "mag": 5.8,
     "type": "globular",
     "blurb": "A globular cluster of several hundred thousand stars, 25,000 light-years away in Hercules.",
     "tip": "Naked-eye in a dark sky; small telescopes resolve the outer stars into a sparkling ball."},
    {"id": "M27", "name": "Dumbbell Nebula", "ra_h": 19.9938, "dec_d": 22.72, "mag": 7.5,
     "type": "planetary",
     "blurb": "A planetary nebula — gas shed by a dying star, 1,360 light-years away in Vulpecula.",
     "tip": "Easily found with binoculars near the head of Cygnus. A small scope shows the dumbbell shape clearly."},
    {"id": "M57", "name": "Ring Nebula", "ra_h": 18.8917, "dec_d": 33.03, "mag": 8.8,
     "type": "planetary",
     "blurb": "A ring of gas around a dead star, 2,300 light-years away in Lyra.",
     "tip": "Small telescope: looks like a tiny smoke ring between the two south stars of the Lyra parallelogram."},
    {"id": "M81", "name": "Bode's Galaxy", "ra_h": 9.9258, "dec_d": 69.07, "mag": 6.9,
     "type": "galaxy",
     "blurb": "A spiral galaxy 12 million light-years away in Ursa Major.",
     "tip": "Binoculars or small telescope from a dark sky. Often paired with M82 nearby."},
    {"id": "M22", "name": "Sagittarius Cluster", "ra_h": 18.6065, "dec_d": -23.90, "mag": 5.1,
     "type": "globular",
     "blurb": "One of the brightest globular clusters in the sky, 10,400 light-years away.",
     "tip": "Naked-eye in a dark sky from southern latitudes; binoculars show a fuzzy ball."},
    {"id": "M51", "name": "Whirlpool Galaxy", "ra_h": 13.4979, "dec_d": 47.20, "mag": 8.4,
     "type": "galaxy",
     "blurb": "A face-on spiral interacting with a small companion galaxy, 23 million light-years away.",
     "tip": "Small telescope under dark skies — look near the handle of the Big Dipper."},
    {"id": "M104", "name": "Sombrero Galaxy", "ra_h": 12.6663, "dec_d": -11.62, "mag": 8.0,
     "type": "galaxy",
     "blurb": "An edge-on spiral with a dramatic dust lane, 31 million light-years away in Virgo.",
     "tip": "Small telescope shows the characteristic hat-brim shape."},
]


# Seasonal constellation picks (Northern Hemisphere oriented; rotate based on month)
_SEASONAL_CONSTELLATIONS = {
    # (month_set) -> constellation info
    (12, 1, 2): {
        "name": "Orion",
        "season": "Winter",
        "mythology": "The mighty hunter of Greek myth, placed in the sky after being killed by a scorpion (now Scorpius, on the opposite side of the sky so they never meet).",
        "find_it": "Look south on winter evenings — you can't miss the three-star belt with the bright stars Betelgeuse (red, top-left) and Rigel (blue-white, bottom-right).",
        "inside": "The Orion Nebula (M42) hangs in the sword below the belt. Betelgeuse is a red supergiant 700× larger than the Sun.",
    },
    (3, 4, 5): {
        "name": "Leo",
        "season": "Spring",
        "mythology": "The Nemean lion slain by Heracles in his first labour. Its skin became impervious armour.",
        "find_it": "Look high in the south on spring evenings — its 'sickle' shape (a backwards question mark) marks the lion's head, anchored by the bright star Regulus.",
        "inside": "Regulus is one of the closest bright stars (79 light-years). The Leo Triplet of galaxies sits below Leo's belly — small telescope target.",
    },
    (6, 7, 8): {
        "name": "Cygnus",
        "season": "Summer",
        "mythology": "Zeus disguised as a swan, swimming down the Milky Way. Also known as the Northern Cross.",
        "find_it": "Look overhead on summer evenings — its cross shape lies along the Milky Way, with bright Deneb at the swan's tail (the top of the cross).",
        "inside": "Deneb is part of the Summer Triangle (with Vega and Altair). The North America Nebula sits next to Deneb, visible in binoculars from dark skies.",
    },
    (9, 10, 11): {
        "name": "Pegasus & Andromeda",
        "season": "Autumn",
        "mythology": "Andromeda, princess chained to a rock and saved by Perseus; her would-be devourer Cetus and Pegasus the winged horse all share the autumn sky.",
        "find_it": "The Great Square of Pegasus dominates the eastern sky on autumn evenings — four roughly equal stars forming a square. Andromeda stretches from its corner.",
        "inside": "Inside Andromeda is M31, the Andromeda Galaxy — the most distant object visible to the naked eye.",
    },
}


def _make_observer():
    obs = ephem.Observer()
    obs.lat = settings.OBSERVER_LAT
    obs.lon = settings.OBSERVER_LON
    obs.elevation = settings.OBSERVER_ELEV
    obs.pressure = 0
    return obs


def _seasonal_constellation():
    month = datetime.now(timezone.utc).month
    for months, info in _SEASONAL_CONSTELLATIONS.items():
        if month in months:
            return info
    return list(_SEASONAL_CONSTELLATIONS.values())[0]


def _ra_h_to_radians(ra_h: float) -> float:
    return ra_h * math.pi / 12


def _dec_d_to_radians(dec_d: float) -> float:
    return dec_d * math.pi / 180


@router.get("/featured-target")
async def get_featured_target(request: Request):
    cache = request.app.state.caches["featured_target"]
    if "data" in cache:
        return cache["data"]

    obs = _make_observer()
    obs.date = ephem.now()

    candidates = []
    for m in _MESSIER:
        try:
            body = ephem.FixedBody()
            body._ra = _ra_h_to_radians(m["ra_h"])
            body._dec = _dec_d_to_radians(m["dec_d"])
            body._epoch = ephem.J2000
            body.compute(obs)
            alt = math.degrees(float(body.alt))
            az = math.degrees(float(body.az))
            # We want a target that's reasonably high right now or rising
            candidates.append({
                **m,
                "altitude_deg": round(alt, 1),
                "azimuth_deg": round(az, 1),
            })
        except Exception:
            continue

    # Prefer high altitude (>30°) and brighter (lower mag)
    visible = [c for c in candidates if c["altitude_deg"] > 30]
    visible.sort(key=lambda c: (c["mag"], -c["altitude_deg"]))
    if visible:
        featured = visible[0]
    else:
        # None high; pick the highest of any
        candidates.sort(key=lambda c: -c["altitude_deg"])
        featured = candidates[0] if candidates else None

    season = _seasonal_constellation()

    result = {
        "target": featured,
        "alternates": visible[1:4] if visible else [],
        "constellation": season,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    cache["data"] = result
    return result
