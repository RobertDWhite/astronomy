from contextlib import asynccontextmanager

from cachetools import TTLCache
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    apod,
    iss,
    launches,
    neo,
    space_weather,
    astronomy,
    solar_system,
    live_feeds,
    tonight,
    satellite_passes,
    clouds,
    aurora,
    comets,
    mars_rover,
    featured_target,
    missions,
    epic,
)
from app.routers.apod import fetch_apod_with_retry

caches: dict[str, TTLCache] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    caches["apod"] = TTLCache(maxsize=1, ttl=3600)
    caches["apod_week"] = TTLCache(maxsize=1, ttl=3600)
    caches["launches"] = TTLCache(maxsize=1, ttl=3600)
    caches["iss"] = TTLCache(maxsize=1, ttl=10)
    caches["space_weather"] = TTLCache(maxsize=1, ttl=300)
    caches["neo"] = TTLCache(maxsize=1, ttl=3600)
    caches["moon"] = TTLCache(maxsize=1, ttl=300)
    caches["planets"] = TTLCache(maxsize=1, ttl=300)
    caches["events"] = TTLCache(maxsize=1, ttl=300)
    caches["solar_system"] = TTLCache(maxsize=1, ttl=600)
    caches["live_feeds"] = TTLCache(maxsize=1, ttl=300)
    caches["tonight"] = TTLCache(maxsize=1, ttl=600)
    caches["passes"] = TTLCache(maxsize=1, ttl=900)
    caches["clouds"] = TTLCache(maxsize=1, ttl=1800)
    caches["aurora"] = TTLCache(maxsize=1, ttl=900)
    caches["comets"] = TTLCache(maxsize=1, ttl=3600)
    caches["mars_rover"] = TTLCache(maxsize=1, ttl=3600)
    caches["featured_target"] = TTLCache(maxsize=1, ttl=1800)
    caches["missions"] = TTLCache(maxsize=1, ttl=3600)
    caches["epic"] = TTLCache(maxsize=1, ttl=3600)
    caches["tle"] = TTLCache(maxsize=4, ttl=21600)  # 6h TLE cache
    app.state.caches = caches

    apod_data = await fetch_apod_with_retry()
    if apod_data:
        caches["apod"]["data"] = apod_data

    yield


app = FastAPI(title="Astronomy Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(apod.router)
app.include_router(iss.router)
app.include_router(launches.router)
app.include_router(neo.router)
app.include_router(space_weather.router)
app.include_router(astronomy.router)
app.include_router(solar_system.router)
app.include_router(live_feeds.router)
app.include_router(tonight.router)
app.include_router(satellite_passes.router)
app.include_router(clouds.router)
app.include_router(aurora.router)
app.include_router(comets.router)
app.include_router(mars_rover.router)
app.include_router(featured_target.router)
app.include_router(missions.router)
app.include_router(epic.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
