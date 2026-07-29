import { apiFetch } from './client'
import type { StravaActivity, StravaActivityDetail, HRStream } from '../store/types'

const BASE = '/api/strava'

async function stravaFetch(path: string, params?: Record<string, string | number>): Promise<Response> {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  }

  const res = await apiFetch(url.toString())

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Strava API error ${res.status}: ${text}`)
  }

  return res
}

// Fetch all activities in a range — uses Supabase cache via /api/activities
export async function fetchAllActivitiesInRange(
  after: Date,
  before: Date
): Promise<StravaActivity[]> {
  const afterUnix = Math.floor(after.getTime() / 1000)
  const beforeUnix = Math.floor(before.getTime() / 1000)

  const url = new URL('/api/activities', window.location.origin)
  url.searchParams.set('after', String(afterUnix))
  url.searchParams.set('before', String(beforeUnix))

  const res = await apiFetch(url.toString())

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Activities fetch error ${res.status}: ${text}`)
  }

  return res.json()
}

// Fetch detailed info for a single activity (includes splits)
export async function fetchActivityDetail(id: number): Promise<StravaActivityDetail> {
  const res = await stravaFetch(`/activities/${id}`)
  return res.json()
}

// Fetch heart rate + distance + time streams for an activity
export async function fetchActivityStreams(id: number): Promise<HRStream | null> {
  try {
    const res = await stravaFetch(`/activities/${id}/streams`, {
      keys: 'heartrate,time,distance',
      key_by_type: 'true',
    })
    const data = await res.json()

    if (!data.heartrate) return null

    return {
      heartrate: data.heartrate?.data ?? [],
      time: data.time?.data ?? [],
      distance: data.distance?.data ?? [],
    }
  } catch {
    return null
  }
}

export function stravaActivityUrl(id: number): string {
  return `https://www.strava.com/activities/${id}`
}
