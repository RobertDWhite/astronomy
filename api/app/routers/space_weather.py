import asyncio
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Request

router = APIRouter()

KP_1M_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
SOLAR_WIND_URL = "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json"
XRAY_URL = "https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json"


def _kp_label(kp: float) -> str:
    if kp <= 2: return "Quiet"
    if kp <= 3: return "Unsettled"
    if kp <= 4: return "Active"
    if kp <= 5: return "Minor Storm"
    if kp <= 6: return "Moderate Storm"
    if kp <= 7: return "Strong Storm"
    if kp <= 8: return "Severe Storm"
    return "Extreme Storm"


def _xray_class(flux) -> str:
    if flux is None or flux <= 0:
        return "A0.0"
    flux = float(flux)
    if flux < 1e-7: return f"A{flux/1e-8:.1f}"
    if flux < 1e-6: return f"B{flux/1e-7:.1f}"
    if flux < 1e-5: return f"C{flux/1e-6:.1f}"
    if flux < 1e-4: return f"M{flux/1e-5:.1f}"
    return f"X{flux/1e-4:.1f}"


@router.get("/space-weather")
async def get_space_weather(request: Request):
    cache = request.app.state.caches["space_weather"]
    if "data" in cache:
        return cache["data"]

    async with httpx.AsyncClient(timeout=15) as client:
        results = await asyncio.gather(
            client.get(KP_1M_URL),
            client.get(SOLAR_WIND_URL),
            client.get(XRAY_URL),
            return_exceptions=True,
        )

    kp_1m_resp, solar_wind_resp, xray_resp = results

    kp_history = []
    kp_index = 0.0
    if not isinstance(kp_1m_resp, Exception):
        try:
            kp_1m_resp.raise_for_status()
            kp_data = kp_1m_resp.json()
            recent = kp_data[-24:] if len(kp_data) >= 24 else kp_data
            for entry in recent:
                kp_val = entry.get("estimated_kp") or entry.get("kp_index") or 0
                kp_history.append({"time": entry.get("time_tag", ""), "kp": float(kp_val)})
            if kp_history:
                kp_index = kp_history[-1]["kp"]
        except Exception:
            pass

    solar_wind_speed = 0.0
    solar_wind_density = 0.0
    if not isinstance(solar_wind_resp, Exception):
        try:
            solar_wind_resp.raise_for_status()
            sw_data = solar_wind_resp.json()
            if len(sw_data) > 1:
                headers = sw_data[0]
                row = dict(zip(headers, sw_data[-1]))
                speed = row.get("speed")
                density = row.get("density")
                solar_wind_speed = float(speed) if speed not in (None, "null", "") else 0.0
                solar_wind_density = float(density) if density not in (None, "null", "") else 0.0
        except Exception:
            pass

    xray_flux = 0.0
    if not isinstance(xray_resp, Exception):
        try:
            xray_resp.raise_for_status()
            xray_data = xray_resp.json()
            long_entries = [e for e in xray_data if e.get("energy") == "0.1-0.8nm"]
            if long_entries:
                xray_flux = float(long_entries[-1].get("flux") or 0)
        except Exception:
            pass

    result = {
        "kp_index": kp_index,
        "kp_label": _kp_label(kp_index),
        "kp_history": kp_history,
        "solar_wind_speed": solar_wind_speed,
        "solar_wind_density": solar_wind_density,
        "xray_flux": xray_flux,
        "xray_class": _xray_class(xray_flux),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    cache["data"] = result
    return result
