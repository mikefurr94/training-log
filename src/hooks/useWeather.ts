import { useState, useEffect } from 'react'
import { fetchWeatherForecast, type DailyWeather } from '../api/weather'

/**
 * Fetches weather forecast using the browser's geolocation.
 * Returns a map of 'YYYY-MM-DD' → DailyWeather for the next 16 days.
 * Caches data for 30 minutes to avoid excessive API calls.
 * Uses module-level state to prevent duplicate fetches across component instances.
 */

interface WeatherCache {
  data: Record<string, DailyWeather>
  fetchedAt: number
}

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes
let globalCache: WeatherCache | null = null
let globalFetching = false
let listeners: Array<(data: Record<string, DailyWeather>) => void> = []

function notifyListeners(data: Record<string, DailyWeather>) {
  for (const fn of listeners) fn(data)
}

function startFetch() {
  if (globalFetching) return
  globalFetching = true

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords
        const forecast = await fetchWeatherForecast(latitude, longitude)
        const map: Record<string, DailyWeather> = {}
        for (const day of forecast) {
          map[day.date] = day
        }
        globalCache = { data: map, fetchedAt: Date.now() }
        notifyListeners(map)
      } catch {
        // Silently fail — weather is nice-to-have
      } finally {
        globalFetching = false
      }
    },
    () => {
      // Geolocation denied or unavailable — no weather
      globalFetching = false
    },
    { enableHighAccuracy: false, timeout: 5000, maximumAge: CACHE_DURATION }
  )
}

export function useWeather(): Record<string, DailyWeather> {
  const [weatherByDate, setWeatherByDate] = useState<Record<string, DailyWeather>>(() => {
    return globalCache ? globalCache.data : {}
  })

  useEffect(() => {
    // Use cached data if still fresh
    if (globalCache && Date.now() - globalCache.fetchedAt < CACHE_DURATION) {
      setWeatherByDate(globalCache.data)
      return
    }

    // Subscribe to updates
    listeners.push(setWeatherByDate)
    startFetch()

    return () => {
      listeners = listeners.filter((fn) => fn !== setWeatherByDate)
    }
  }, [])

  return weatherByDate
}
