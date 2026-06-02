// TypeScript interfaces for all API response shapes

export interface APODResponse {
  date: string
  title: string
  explanation: string
  url: string
  hdurl?: string
  media_type: 'image' | 'video'
  copyright?: string
  service_version: string
}

export interface APODWeekItem {
  date: string
  title: string
  url: string
  hdurl?: string
  thumbnail_url?: string
  media_type: 'image' | 'video'
}

export interface APODWeekResponse {
  days: APODWeekItem[]
}

export interface ISSPosition {
  latitude: number
  longitude: number
  altitude: number
  velocity: number
  timestamp: number
}

export interface ISSCrew {
  name: string
  craft: string
}

export interface ISSResponse {
  position: ISSPosition
  crew: ISSCrew[]
  timestamp: string
}

export interface Launch {
  id: string
  name: string
  provider: string
  vehicle: string
  pad: string
  location: string
  net: string
  status: string
  mission_description?: string
  image_url?: string
  url?: string
  viewable_from_observer?: boolean
  viewable_note?: string | null
}

export interface LaunchesResponse {
  launches: Launch[]
}

export interface NEOObject {
  id: string
  name: string
  diameter_min_km: number
  diameter_max_km: number
  miss_distance_km: number
  miss_distance_lunar: number
  miss_distance_au: number
  velocity_km_s: number
  velocity_km_h: number
  approach_date: string
  approach_datetime: string
  orbiting_body: string
  is_potentially_hazardous: boolean
  is_sentry_object: boolean
  absolute_magnitude: number
  nasa_jpl_url?: string
  noteworthy?: boolean
  noteworthy_reason?: string | null
}

export interface NEOResponse {
  objects: NEOObject[]
  count: number
  noteworthy_count?: number
}

export interface KpEntry { time: string; kp: number }

export interface SpaceWeatherResponse {
  kp_index: number
  kp_label: string
  kp_history: KpEntry[]
  solar_wind_speed: number
  solar_wind_density: number
  xray_flux: number
  xray_class: string
  timestamp: string
}

export interface MoonPhaseDate { date: string; phase: string }

export interface MoonResponse {
  phase_name: string
  illumination: number
  age_days: number
  distance_km: number
  next_new_moon: string
  next_full_moon: string
  next_first_quarter: string
  next_last_quarter: string
  upcoming_phases: MoonPhaseDate[]
}

export interface Planet {
  name: string
  constellation: string
  magnitude: number
  altitude: number
  azimuth: number
  rise_time?: string
  set_time?: string
  transit_time?: string
  distance_au: number
  angular_diameter_arcsec: number
  is_dwarf_planet?: boolean
}

export interface PlanetsResponse {
  planets: Planet[]
  observer_location: string
  timestamp: string
}

export interface AstroEvent {
  id: string
  date: string
  name: string
  type: string
  description: string
  days_until?: number
  visible_from_observer?: boolean
  local_note?: string
}

export interface EventsResponse { events: AstroEvent[] }

export interface LiveFeed {
  id: string
  channel_id: string
  video_id: string | null
  is_live: boolean
}

export interface TonightResponse {
  now: string
  sunset: string | null
  sunrise: string | null
  civil_twilight_end: string | null
  nautical_twilight_end: string | null
  astro_twilight_end: string | null
  astro_twilight_start: string | null
  moonrise: string | null
  moonset: string | null
  moon_illumination: number
  dark_window_start: string | null
  dark_window_end: string | null
  dark_minutes: number
  good_window_start: string | null
  good_window_end: string | null
  good_window_minutes: number
  verdict: string
  observer_lat: number
  observer_lon: number
  galactic_center_alt_deg?: number
  galactic_center_az_deg?: number
}

export interface SatellitePass {
  satellite: string
  rise_time: string
  rise_direction: string
  rise_az_deg: number
  peak_time: string
  peak_altitude_deg: number
  set_time: string
  set_direction: string
  duration_seconds: number
  is_visible: boolean
  approx_magnitude: number
}

export interface SatellitePassesResponse {
  passes: SatellitePass[]
  all_passes: SatellitePass[]
}

export interface CloudHour {
  time: string
  cloud_cover_pct: number | null
  visibility_m: number | null
  temp_c: number | null
  precip_chance_pct: number | null
}

export interface CloudsResponse {
  hourly: CloudHour[]
  best_window: CloudHour | null
  lat: number
  lon: number
}

export interface AuroraForecastDay {
  date: string
  peak_kp: number
  chance_at_location: string
}

export interface AuroraResponse {
  observer_lat: number
  current_kp: number
  threshold_kp: number
  chance: 'none' | 'low' | 'moderate' | 'high'
  message: string
  forecast: AuroraForecastDay[]
}

export interface Comet {
  name: string
  designation: string
  magnitude: number
  visibility: 'naked_eye' | 'binocular' | 'small_telescope' | 'faint'
  altitude_deg: number
  azimuth_deg: number
  constellation: string | null
  sun_distance_au: number
  earth_distance_au: number
  note: string
}

export interface CometsResponse {
  comets: Comet[]
  naked_eye_count: number
  binocular_count: number
  headline: string
}

export interface MarsRoverPhoto {
  rover: string
  image_url: string
  earth_date: string
  sol: number
  camera: string | null
}

export interface MarsRoverResponse {
  photos: MarsRoverPhoto[]
}

export interface FeaturedMessier {
  id: string
  name: string
  ra_h: number
  dec_d: number
  mag: number
  type: string
  blurb: string
  tip: string
  altitude_deg: number
  azimuth_deg: number
}

export interface FeaturedConstellation {
  name: string
  season: string
  mythology: string
  find_it: string
  inside: string
}

export interface FeaturedTargetResponse {
  target: FeaturedMessier | null
  alternates: FeaturedMessier[]
  constellation: FeaturedConstellation
}

export interface Mission {
  id: string
  name: string
  agency: string
  status: string
  launched: string
  distance_km: number
  distance_au: number
  light_delay_seconds: number
  light_delay_human: string
  speed_kms: number
  blurb: string
}

export interface MissionsResponse { missions: Mission[] }

export interface EPICResponse {
  image_url: string | null
  date: string | null
  caption: string | null
  source: string
}

async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal })
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json() as Promise<T>
}

export function fetchAPOD(signal?: AbortSignal) { return apiFetch<APODResponse>('/api/apod', signal) }
export function fetchAPODWeek(signal?: AbortSignal) { return apiFetch<APODWeekResponse>('/api/apod/week', signal) }
export function fetchISS(signal?: AbortSignal) { return apiFetch<ISSResponse>('/api/iss', signal) }
export function fetchLaunches(signal?: AbortSignal) { return apiFetch<LaunchesResponse>('/api/launches', signal) }
export function fetchNEO(signal?: AbortSignal) { return apiFetch<NEOResponse>('/api/neo', signal) }
export function fetchSpaceWeather(signal?: AbortSignal) { return apiFetch<SpaceWeatherResponse>('/api/space-weather', signal) }
export function fetchMoon(signal?: AbortSignal) { return apiFetch<MoonResponse>('/api/moon', signal) }
export function fetchPlanets(signal?: AbortSignal) { return apiFetch<PlanetsResponse>('/api/planets', signal) }
export function fetchEvents(signal?: AbortSignal) { return apiFetch<EventsResponse>('/api/events', signal) }
export function fetchLiveFeeds(signal?: AbortSignal) { return apiFetch<LiveFeed[]>('/api/live-feeds', signal) }
export function fetchTonight(signal?: AbortSignal) { return apiFetch<TonightResponse>('/api/tonight', signal) }
export function fetchSatellitePasses(signal?: AbortSignal) { return apiFetch<SatellitePassesResponse>('/api/satellite-passes', signal) }
export function fetchClouds(signal?: AbortSignal) { return apiFetch<CloudsResponse>('/api/clouds', signal) }
export function fetchAurora(signal?: AbortSignal) { return apiFetch<AuroraResponse>('/api/aurora', signal) }
export function fetchComets(signal?: AbortSignal) { return apiFetch<CometsResponse>('/api/comets', signal) }
export function fetchMarsRover(signal?: AbortSignal) { return apiFetch<MarsRoverResponse>('/api/mars-rover', signal) }
export function fetchFeaturedTarget(signal?: AbortSignal) { return apiFetch<FeaturedTargetResponse>('/api/featured-target', signal) }
export function fetchMissions(signal?: AbortSignal) { return apiFetch<MissionsResponse>('/api/missions', signal) }
export function fetchEPIC(signal?: AbortSignal) { return apiFetch<EPICResponse>('/api/epic', signal) }
