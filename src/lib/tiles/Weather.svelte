<script lang="ts">
  import type { WeatherTile } from '../config'

  let { tile }: { tile: WeatherTile } = $props()

  interface Reading { temp: number; code: number; hi: number; lo: number; at: number }
  interface Forecast {
    current: { temperature_2m: number; weather_code: number }
    daily:   { temperature_2m_max: number[]; temperature_2m_min: number[] }
  }

  // WMO weather codes, by upper bound of each range.
  const conditions: [number, string][] = [
    [0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Overcast'], [48, 'Fog'],
    [57, 'Drizzle'], [67, 'Rain'], [77, 'Snow'], [82, 'Showers'], [86, 'Snow showers'], [99, 'Thunderstorm'],
  ]
  const condition = (code: number) => conditions.find(([max]) => code <= max)?.[1] ?? ''
  const freshFor  = 30 * 60 * 1000

  let reading = $state<Reading | null>(null)
  let failed  = $state(false)

  function cached(key: string): Reading | null {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') }
    catch { return null }
  }

  // ponytail: fetches once per page load; a long-open tab won't refresh until reopened.
  $effect(() => {
    const { lat, lon, fahrenheit } = tile
    if (lat === null || lon === null) return

    const key = `weather:${lat},${lon},${fahrenheit ? 'f' : 'c'}`
    const old = cached(key)
    reading = old
    failed  = false
    if (old && Date.now() - old.at < freshFor) return

    const params = new URLSearchParams({
      latitude: String(lat), longitude: String(lon), timezone: 'auto', forecast_days: '1',
      current: 'temperature_2m,weather_code', daily: 'temperature_2m_max,temperature_2m_min',
      temperature_unit: fahrenheit ? 'fahrenheit' : 'celsius',
    })
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      .then(r => (r.ok ? (r.json() as Promise<Forecast>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(d => {
        reading = { temp: d.current.temperature_2m, code: d.current.weather_code, hi: d.daily.temperature_2m_max[0], lo: d.daily.temperature_2m_min[0], at: Date.now() }
        localStorage.setItem(key, JSON.stringify(reading))
      })
      .catch(error => {
        console.warn('Foyer: weather request failed', error)
        failed = !old
      })
  })
</script>

<div class="weather">
  {#if tile.lat === null}
    <p class="hint">Pick a place for this tile in edit mode.</p>
  {:else if reading}
    <p class="temp">{Math.round(reading.temp)}°</p>
    <p class="cond">{condition(reading.code)}</p>
    <p class="meta"><span>{tile.place}</span><span>{Math.round(reading.hi)}° / {Math.round(reading.lo)}°</span></p>
  {:else if failed}
    <p class="hint">Weather is unavailable right now.</p>
  {/if}
</div>
