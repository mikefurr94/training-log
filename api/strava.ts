import type { VercelRequest, VercelResponse } from '@vercel/node'

const STRAVA_BASE = 'https://www.strava.com/api/v3'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract the path after /api/strava
  const path = (req.query.path as string[] | undefined)?.join('/') ?? ''

  // Forward the Authorization header from the frontend
  const auth = req.headers['authorization']
  if (!auth) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  // Build the Strava URL, forwarding any query params (excluding 'path')
  const url = new URL(`${STRAVA_BASE}/${path}`)
  Object.entries(req.query).forEach(([k, v]) => {
    if (k !== 'path') url.searchParams.set(k, String(v))
  })

  try {
    const stravaRes = await fetch(url.toString(), {
      headers: { Authorization: auth },
    })

    const data = await stravaRes.json()

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(stravaRes.status).json(data)
  } catch (err) {
    console.error('Strava proxy error:', err)
    return res.status(500).json({ error: 'Failed to fetch from Strava' })
  }
}
