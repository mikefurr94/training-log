import type { VercelRequest, VercelResponse } from '@vercel/node'

const STRAVA_BASE = 'https://www.strava.com/api/v3'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // The rewrite rule maps /api/strava/:path* -> /api/strava?path=:path*
  // req.query.path will be a string like "athlete/activities"
  const rawPath = req.query.path
  const path = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath ?? '')

  // Forward the Authorization header from the frontend
  const auth = req.headers['authorization']
  if (!auth) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  // Build the Strava URL, forwarding any query params (excluding 'path')
  const url = new URL(`${STRAVA_BASE}/${path}`)
  Object.entries(req.query).forEach(([k, v]) => {
    if (k !== 'path') {
      url.searchParams.set(k, Array.isArray(v) ? v[0] : String(v))
    }
  })

  console.log('Proxying to Strava:', url.toString())

  try {
    const stravaRes = await fetch(url.toString(), {
      headers: { Authorization: auth },
    })

    const text = await stravaRes.text()
    console.log('Strava response status:', stravaRes.status)

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
