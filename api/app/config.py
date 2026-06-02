from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    NASA_API_KEY: str
    YOUTUBE_API_KEY: str = ""
    OBSERVER_LAT: str = "39.5"
    OBSERVER_LON: str = "-84.5"
    OBSERVER_ELEV: float = 300.0


settings = Settings()
