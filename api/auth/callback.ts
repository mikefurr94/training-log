import type { VercelRequest, VercelResponse } from '@vercel/node'

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!
const TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(response.status).json({ error: err.message ?? 'Token exchange failed' })
    }

    const data = await response.json()
    const { access_token, refresh_token, expires_at, athlete } = data
    return res.json({ access_token, refresh_token, expires_at, athlete })
  } catch (err) {
    console.error('Token exchange error:', err)
    return res.status(500).json({ error: 'Failed to exchange token' })
  }
}
