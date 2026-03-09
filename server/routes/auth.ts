import { Router, Request, Response } from 'express'
import axios from 'axios'

export const authRouter = Router()

const TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token'

// Redirect to Strava OAuth authorization page
authRouter.get('/strava', (_req: Request, res: Response) => {
  const CLIENT_ID = process.env.STRAVA_CLIENT_ID!
  const REDIRECT_URI = 'http://localhost:3000/callback'
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  res.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`)
})

// Exchange authorization code for tokens (called from frontend with ?code=)
authRouter.get('/callback', async (req: Request, res: Response) => {
  const CLIENT_ID = process.env.STRAVA_CLIENT_ID!
  const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!
  const { code } = req.query
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing authorization code' })
    return
  }

  try {
    const response = await axios.post(TOKEN_URL, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    })

    const { access_token, refresh_token, expires_at, athlete } = response.data
    res.json({ access_token, refresh_token, expires_at, athlete })
  } catch (err) {
    console.error('Token exchange error:', err)
    res.status(500).json({ error: 'Failed to exchange token' })
  }
})

// Refresh an expired access token
authRouter.post('/refresh', async (req: Request, res: Response) => {
  const CLIENT_ID = process.env.STRAVA_CLIENT_ID!
  const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!
  const { refresh_token } = req.body
  if (!refresh_token) {
    res.status(400).json({ error: 'Missing refresh_token' })
    return
  }

  try {
    const response = await axios.post(TOKEN_URL, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    })

    const { access_token, refresh_token: new_refresh, expires_at } = response.data
    res.json({ access_token, refresh_token: new_refresh, expires_at })
  } catch (err) {
    console.error('Token refresh error:', err)
    res.status(500).json({ error: 'Failed to refresh token' })
  }
})
