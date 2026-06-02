import asyncio
import re

import httpx
from fastapi import APIRouter, Request

router = APIRouter()

FEEDS = [
    {"id": "nasa-tv",   "channel_id": "UCVTomc35agH1SM6kCKzwW_g"},
    {"id": "iss-hdev",  "channel_id": "UCLA_DiR1FfKNvjuUpBHmylQ"},  # NASA Live
    {"id": "iss-afar",     "channel_id": "UCaG0IHN1RMOZ4-U3wDXAkwA"},  # afarTV - 24/7 ISS Earth view
    {"id": "nsf-starbase", "channel_id": "UCSUu1lih2RifWkKtDOJdsBA"},  # NSF - 24/7 Starbase
    {"id": "avid-space",   "channel_id": "UCFwMITSkc1Fms6PoJoh1OUQ"},  # Avid Space - 24/7 astronomy
    {"id": "spacex",    "channel_id": "UCtI0Hodo5o5dUb67FeUjAlg"},
    {"id": "nasa-jpl",  "channel_id": "UCBcRF18a7Qf58cCRy5xuWwQ"},
    {"id": "esa",       "channel_id": "UCIBaDdAbGlFDeS-z_CchMpA"},
]

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)
_VIDEO_ID_RE = re.compile(r'"videoId":"([A-Za-z0-9_-]{11})"')


async def _resolve_feed(client: httpx.AsyncClient, channel_id: str) -> tuple[str | None, bool]:
    """Scrape /live. Returns (video_id, is_live).

    YouTube's /live URL behavior:
      - If a live broadcast is airing: page contains "isLive":true and the live videoId
      - Otherwise: serves the channel's main page with a featured/recent videoId, or a
        small "channel offline" shell with no videoId at all.
    We return whatever videoId we find; is_live only true when YouTube marks it so.
    """
    try:
        r = await client.get(
            f"https://www.youtube.com/channel/{channel_id}/live",
            headers={"User-Agent": _UA, "Accept-Language": "en-US,en;q=0.9"},
            follow_redirects=True,
            timeout=8,
        )
        if r.status_code != 200:
            return None, False
        body = r.text
        is_live = '"isLive":true' in body or '"isLiveNow":true' in body
        m = _VIDEO_ID_RE.search(body)
        video_id = m.group(1) if m else None
        return video_id, is_live
    except Exception:
        return None, False


@router.get("/live-feeds")
async def get_live_feeds(request: Request):
    cache = request.app.state.caches["live_feeds"]
    if "data" in cache:
        return cache["data"]

    async with httpx.AsyncClient() as client:
        resolved = await asyncio.gather(
            *(_resolve_feed(client, feed["channel_id"]) for feed in FEEDS),
        )

    results = [
        {
            "id": feed["id"],
            "channel_id": feed["channel_id"],
            "video_id": vid,
            "is_live": is_live,
        }
        for feed, (vid, is_live) in zip(FEEDS, resolved)
    ]

    cache["data"] = results
    return results
