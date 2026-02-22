import type { VercelRequest, VercelResponse } from '@vercel/node'

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!
const TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { refresh_token } = req.body
  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing refresh_token' })
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(response.status).json({ error: err.message ?? 'Token refresh failed' })
    }

    const data = await response.json()
    const { access_token, refresh_token: new_refresh, expires_at } = data
    return res.json({ access_token, refresh_token: new_refresh, expires_at })
  } catch (err) {
    console.error('Token refresh error:', err)
    return res.status(500).json({ error: 'Failed to refresh token' })
  }
}
