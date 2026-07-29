import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireSession } from './_lib/session.js'
import { getValidStravaConnection } from './_lib/stravaConnection.js'

const STRAVA_BASE = 'https://www.strava.com/api/v3'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await requireSession(req, res)
  if (!userId) return

  const connection = await getValidStravaConnection(userId)
  if (!connection) return res.status(409).json({ error: 'Strava not connected' })

  // The rewrite rule maps /api/strava/:path* -> /api/strava?path=:path*
  // req.query.path will be a string like "athlete/activities"
  const rawPath = req.query.path
  const path = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath ?? '')

  // Build the Strava URL, forwarding any query params (excluding 'path')
  const url = new URL(`${STRAVA_BASE}/${path}`)
  Object.entries(req.query).forEach(([k, v]) => {
    if (k !== 'path') {
      url.searchParams.set(k, Array.isArray(v) ? v[0] : String(v))
    }
  })

  try {
    const stravaRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${connection.accessToken}` },
    })

    const text = await stravaRes.text()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.error('Non-JSON response from Strava:', text.slice(0, 200))
      return res.status(502).json({ error: 'Invalid response from Strava', detail: text.slice(0, 200) })
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(stravaRes.status).json(data)
  } catch (err) {
    console.error('Strava proxy error:', err)
    return res.status(500).json({ error: 'Failed to fetch from Strava', detail: String(err) })
  }
}
