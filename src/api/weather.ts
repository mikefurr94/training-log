/**
 * Weather API using Open-Meteo (free, no API key needed).
 * Fetches daily forecast for the next 16 days.
 */

export interface DailyWeather {
  date: string // 'YYYY-MM-DD'
  tempHigh: number // °F
  tempLow: number // °F
  feelsLikeHigh: number // °F
  feelsLikeLow: number // °F
  feelsLikeAt7am: number | null // °F — hourly apparent temp at 7:00 AM local
  weatherCode: number // WMO weather code
}

// WMO Weather interpretation codes → icon + label
const WEATHER_ICONS: Record<number, { icon: string; label: string }> = {
  0: { icon: '☀️', label: 'Clear' },
  1: { icon: '🌤️', label: 'Mostly clear' },
  2: { icon: '⛅', label: 'Partly cloudy' },
  3: { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫️', label: 'Fog' },
  48: { icon: '🌫️', label: 'Rime fog' },
  51: { icon: '🌦️', label: 'Light drizzle' },
  53: { icon: '🌦️', label: 'Drizzle' },
  55: { icon: '🌦️', label: 'Dense drizzle' },
  56: { icon: '🌧️', label: 'Freezing drizzle' },
  57: { icon: '🌧️', label: 'Heavy freezing drizzle' },
  61: { icon: '🌧️', label: 'Light rain' },
  63: { icon: '🌧️', label: 'Rain' },
  65: { icon: '🌧️', label: 'Heavy rain' },
  66: { icon: '🌧️', label: 'Freezing rain' },
  67: { icon: '🌧️', label: 'Heavy freezing rain' },
  71: { icon: '🌨️', label: 'Light snow' },
  73: { icon: '🌨️', label: 'Snow' },
  75: { icon: '🌨️', label: 'Heavy snow' },
  77: { icon: '🌨️', label: 'Snow grains' },
  80: { icon: '🌦️', label: 'Light showers' },
  81: { icon: '🌧️', label: 'Showers' },
  82: { icon: '🌧️', label: 'Heavy showers' },
  85: { icon: '🌨️', label: 'Light snow showers' },
  86: { icon: '🌨️', label: 'Heavy snow showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' },
  96: { icon: '⛈️', label: 'Thunderstorm w/ hail' },
  99: { icon: '⛈️', label: 'Thunderstorm w/ heavy hail' },
}

export function getWeatherIcon(code: number): { icon: string; label: string } {
  return WEATHER_ICONS[code] ?? { icon: '🌤️', label: 'Unknown' }
}

export async function fetchWeatherForecast(
  lat: number,
  lon: number
): Promise<DailyWeather[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,weather_code&hourly=apparent_temperature&temperature_unit=fahrenheit&timezone=auto&forecast_days=16`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`)

  const data = await res.json()
  const daily = data.daily
  const hourlyApparent: number[] | undefined = data.hourly?.apparent_temperature

  return daily.time.map((date: string, i: number) => {
    // Extract 7:00 AM feels-like from hourly data (24 entries per day, index 7 = 7am)
    let feelsLikeAt7am: number | null = null
    if (hourlyApparent) {
      const idx = i * 24 + 7
      if (idx < hourlyApparent.length && hourlyApparent[idx] != null) {
        feelsLikeAt7am = Math.round(hourlyApparent[idx])
      }
    }

    return {
      date,
      tempHigh: Math.round(daily.temperature_2m_max[i]),
      tempLow: Math.round(daily.temperature_2m_min[i]),
      feelsLikeHigh: Math.round(daily.apparent_temperature_max[i]),
      feelsLikeLow: Math.round(daily.apparent_temperature_min[i]),
      feelsLikeAt7am,
      weatherCode: daily.weather_code[i],
    }
  })
}
