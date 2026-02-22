import { getValidToken } from './auth'
import type { StravaActivity, StravaActivityDetail, HRStream } from '../store/types'

const BASE = '/api/strava'

async function stravaFetch(path: string, params?: Record<string, string | number>): Promise<Response> {
  const token = await getValidToken()
  const url = new URL(`${BASE}${path}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Strava API error ${res.status}: ${text}`)
  }

  return res
}

// Fetch a paginated batch of activities within a Unix timestamp range
export async function fetchActivities(
  afterUnix: number,
  beforeUnix: number,
  page = 1,
  perPage = 200
): Promise<StravaActivity[]> {
  const res = await stravaFetch('/athlete/activities', {
    after: afterUnix,
    before: beforeUnix,
    per_page: perPage,
    page,
  })
  return res.json()
}

// Fetch all activities in a range (handles pagination automatically)
export async function fetchAllActivitiesInRange(
  after: Date,
  before: Date
): Promise<StravaActivity[]> {
  const afterUnix = Math.floor(after.getTime() / 1000)
  const beforeUnix = Math.floor(before.getTime() / 1000)

  const all: StravaActivity[] = []
  let page = 1

  while (true) {
    const batch = await fetchActivities(afterUnix, beforeUnix, page, 200)
    all.push(...batch)
    if (batch.length < 200) break
    page++
  }

  return all
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

    // Strava returns streams keyed by type when key_by_type=true
    if (!data.heartrate) return null

    return {
      heartrate: data.heartrate?.data ?? [],
      time: data.time?.data ?? [],
      distance: data.distance?.data ?? [],
    }
  } catch {
    // Heart rate data may not be available for all activities/devices
    return null
  }
}

export function stravaActivityUrl(id: number): string {
  return `https://www.strava.com/activities/${id}`
}
