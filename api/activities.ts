import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { requireSession } from './_lib/session.js'
import { getValidStravaConnection } from './_lib/stravaConnection.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Activity = Record<string, any>

async function fetchFromStrava(path: string, params: Record<string, string>, accessToken: string): Promise<Activity[]> {
  const url = new URL(`https://www.strava.com/api/v3${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[api/activities] Strava error ${res.status}:`, body)
    throw new Error(`Strava error ${res.status}: ${body}`)
  }
  return res.json()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await requireSession(req, res)
  if (!userId) return

  const { after, before } = req.query
  if (!after || !before) {
    return res.status(400).json({ error: 'Missing after or before params' })
  }

  const afterTs = Number(after)
  const beforeTs = Number(before)

  const connection = await getValidStravaConnection(userId)
  if (!connection) return res.status(200).json([])

  try {
    // 1. Check Supabase cache for activities in this range
    const { data: cached } = await supabase
      .from('activities')
      .select('id, data')
      .eq('user_id', userId)
      .gte('data->>start_date_local', new Date(afterTs * 1000).toISOString().slice(0, 10))
      .lte('data->>start_date_local', new Date(beforeTs * 1000).toISOString().slice(0, 10))

    const cachedIds = new Set((cached ?? []).map((r) => r.id as number))
    const cachedActivities: Activity[] = (cached ?? []).map((r) => r.data as Activity)

    // 2. Fetch all pages from Strava
    const fresh: Activity[] = []
    let page = 1
    while (true) {
      const batch = await fetchFromStrava('/athlete/activities', {
        after: String(afterTs),
        before: String(beforeTs),
        per_page: '200',
        page: String(page),
      }, connection.accessToken)
      fresh.push(...batch)
      if (batch.length < 200) break
      page++
    }

    // 3. Upsert any new/updated activities into Supabase
    const toUpsert = fresh.filter((a) => !cachedIds.has(a.id as number))
    if (toUpsert.length > 0) {
      await supabase.from('activities').upsert(
        toUpsert.map((a) => ({
          id: a.id,
          athlete_id: connection.athleteId,
          user_id: userId,
          data: a,
          fetched_at: new Date().toISOString(),
        }))
      )
    }

    // 4. Merge cached + fresh (fresh wins on conflict)
    const freshIds = new Set(fresh.map((a) => a.id as number))
    const mergedOld = cachedActivities.filter((a) => !freshIds.has(a.id as number))
    const all = [...fresh, ...mergedOld]

    return res.status(200).json(all)
  } catch (err) {
    console.error('Activities error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
