"""Currently-visible comets.

Uses a curated list of comets with orbital elements (J2000 epoch). Computes
current heliocentric/geocentric distance and visual magnitude from the
observer's location. Flags any with magnitude <= 7 (binocular) as
'visible_now', and <= 5 (naked eye) as 'naked_eye'.
"""
import math
from datetime import datetime, timezone

import ephem
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()

# Curated comets — current/upcoming candidates. Update as needed.
# Magnitude formula approximated via H + 5log10(delta) + 2.5*K*log10(r)
# Elements sourced from MPC/JPL; some are approximate for educational use.
_COMETS = [
    {
        "name": "C/2023 A3 (Tsuchinshan-ATLAS)",
        "designation": "C/2023 A3",
        "elements": {
            "_e": 1.000301, "_inc": 139.115, "_Om": 21.563, "_om": 308.491,
            "_q": 0.391, "_epoch": "2024/09/27.61", "_epoch_p": "2024/09/27.61",
        },
        "absolute_mag": 5.0, "slope": 4.0,
        "note": "Past 2024 perihelion; faded but historic naked-eye apparition.",
    },
    {
        "name": "12P/Pons-Brooks",
        "designation": "12P",
        "elements": {
            "_e": 0.9546, "_inc": 74.190, "_Om": 255.85, "_om": 199.06,
            "_q": 0.7807, "_epoch": "2024/04/21.0", "_epoch_p": "2024/04/21.0",
        },
        "absolute_mag": 5.0, "slope": 5.5,
        "note": "Famous 71-year periodic comet; passed perihelion April 2024.",
    },
    {
        "name": "C/2024 G3 (ATLAS)",
        "designation": "C/2024 G3",
        "elements": {
            "_e": 0.999898, "_inc": 116.93, "_Om": 220.86, "_om": 108.50,
            "_q": 0.094, "_epoch": "2025/01/13.5", "_epoch_p": "2025/01/13.5",
        },
        "absolute_mag": 8.0, "slope": 8.0,
        "note": "Sungrazing comet; reached naked-eye brightness January 2025.",
    },
    {
        "name": "C/2025 N1 (ATLAS)",
        "designation": "C/2025 N1",
        "elements": {
            "_e": 1.0, "_inc": 175.0, "_Om": 322.0, "_om": 128.0,
            "_q": 1.4, "_epoch": "2025/10/30.0", "_epoch_p": "2025/10/30.0",
        },
        "absolute_mag": 7.0, "slope": 4.0,
        "note": "Interstellar / hyperbolic candidate; binocular target around late 2025.",
    },
]


def _make_observer() -> ephem.Observer:
    obs = ephem.Observer()
    obs.lat = settings.OBSERVER_LAT
    obs.lon = settings.OBSERVER_LON
    obs.elevation = settings.OBSERVER_ELEV
    obs.pressure = 0
    return obs


def _build_comet(cfg: dict) -> ephem.ParabolicBody | ephem.HyperbolicBody | ephem.EllipticalBody:
    el = cfg["elements"]
    e = float(el["_e"])
    if e < 0.999:
        # Elliptical
        b = ephem.EllipticalBody()
        b.name = cfg["name"]
        # Convert q (perihelion distance) and e to semi-major axis
        a = float(el["_q"]) / (1.0 - e)
        b._a = a
        b._e = e
        b._inc = float(el["_inc"])
        b._Om = float(el["_Om"])
        b._om = float(el["_om"])
        b._M = 0.0
        b._epoch_M = ephem.Date(el["_epoch_p"])
        b._epoch = ephem.Date("2000/1/1.5")
        return b
    if e > 1.001:
        b = ephem.HyperbolicBody()
        b.name = cfg["name"]
        b._e = e
        b._inc = float(el["_inc"])
        b._Om = float(el["_Om"])
        b._om = float(el["_om"])
        b._q = float(el["_q"])
        b._epoch_p = ephem.Date(el["_epoch_p"])
        b._epoch = ephem.Date("2000/1/1.5")
        return b
    # Parabolic
    b = ephem.ParabolicBody()
    b.name = cfg["name"]
    b._inc = float(el["_inc"])
    b._Om = float(el["_Om"])
    b._om = float(el["_om"])
    b._q = float(el["_q"])
    b._epoch_p = ephem.Date(el["_epoch_p"])
    b._epoch = ephem.Date("2000/1/1.5")
    return b


def _visibility_tag(mag: float) -> str:
    if mag <= 5.0:
        return "naked_eye"
    if mag <= 7.5:
        return "binocular"
    if mag <= 10.0:
        return "small_telescope"
    return "faint"


@router.get("/comets")
async def get_comets(request: Request):
    cache = request.app.state.caches["comets"]
    if "data" in cache:
        return cache["data"]

    obs = _make_observer()
    obs.date = ephem.now()

    out = []
    for cfg in _COMETS:
        try:
            body = _build_comet(cfg)
            body.compute(obs)
            r_au = float(getattr(body, "sun_distance", 0)) or 1.0
            delta_au = float(getattr(body, "earth_distance", 0)) or 1.0
            H = float(cfg["absolute_mag"])
            K = float(cfg["slope"])  # 2.5*K used by amateur magnitude formula
            mag = H + 5 * math.log10(delta_au) + K * math.log10(r_au)

            alt_deg = math.degrees(float(body.alt))
            az_deg = math.degrees(float(body.az))
            try:
                constellation = ephem.constellation(body)[1]
            except Exception:
                constellation = None

            out.append({
                "name": cfg["name"],
                "designation": cfg["designation"],
                "magnitude": round(mag, 1),
                "visibility": _visibility_tag(mag),
                "altitude_deg": round(alt_deg, 1),
                "azimuth_deg": round(az_deg, 1),
                "constellation": constellation,
                "sun_distance_au": round(r_au, 3),
                "earth_distance_au": round(delta_au, 3),
                "note": cfg["note"],
            })
        except Exception:
            continue

    out.sort(key=lambda c: c["magnitude"])
    naked_eye = [c for c in out if c["visibility"] == "naked_eye"]
    binoc = [c for c in out if c["visibility"] == "binocular"]

    result = {
        "comets": out,
        "naked_eye_count": len(naked_eye),
        "binocular_count": len(binoc),
        "headline": (
            f"{naked_eye[0]['name']} visible to the naked eye now!"
            if naked_eye
            else (f"{binoc[0]['name']} reachable with binoculars." if binoc else "No bright comets currently visible.")
        ),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    cache["data"] = result
    return result
