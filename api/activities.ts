import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './lib/supabase'

const STRAVA_BASE = 'https://www.strava.com/api/v3'

async function fetchFromStrava(path: string, params: Record<string, string>, auth: string) {
  const url = new URL(`${STRAVA_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: { Authorization: auth } })
  if (!res.ok) throw new Error(`Strava error ${res.status}`)
  return res.json()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers['authorization']
  if (!auth) return res.status(401).json({ error: 'Missing authorization header' })

  const { athlete_id, after, before } = req.query
  if (!athlete_id || !after || !before) {
    return res.status(400).json({ error: 'Missing athlete_id, after, or before params' })
  }

  const athleteId = Number(athlete_id)
  const afterTs = Number(after)
  const beforeTs = Number(before)

  try {
    // 1. Check Supabase cache for activities in this range
    const { data: cached } = await supabase
      .from('activities')
      .select('id, data')
      .eq('athlete_id', athleteId)
      .gte('data->>start_date_local', new Date(afterTs * 1000).toISOString().slice(0, 10))
      .lte('data->>start_date_local', new Date(beforeTs * 1000).toISOString().slice(0, 10))

    const cachedIds = new Set((cached ?? []).map((r: { id: number }) => r.id))
    const cachedActivities = (cached ?? []).map((r: { data: unknown }) => r.data)

    // 2. Fetch all pages from Strava
    const fresh: Record<string, unknown>[] = []
    let page = 1
    while (true) {
      const batch = await fetchFromStrava('/athlete/activities', {
        after: String(afterTs),
        before: String(beforeTs),
        per_page: '200',
        page: String(page),
      }, auth)
      fresh.push(...batch)
      if (batch.length < 200) break
      page++
    }

    // 3. Upsert any new/updated activities into Supabase
    const toUpsert = fresh.filter((a: Record<string, unknown>) => !cachedIds.has(a.id as number))
    if (toUpsert.length > 0) {
      await supabase.from('activities').upsert(
        toUpsert.map((a: Record<string, unknown>) => ({
          id: a.id,
          athlete_id: athleteId,
          data: a,
          fetched_at: new Date().toISOString(),
        }))
      )
    }

    // 4. Merge cached + fresh (fresh wins on conflict)
    const freshIds = new Set(fresh.map((a: Record<string, unknown>) => a.id as number))
    const mergedOld = cachedActivities.filter((a: Record<string, unknown>) => !freshIds.has(a.id as number))
    const all = [...fresh, ...mergedOld]

    return res.status(200).json(all)
  } catch (err) {
    console.error('Activities error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
