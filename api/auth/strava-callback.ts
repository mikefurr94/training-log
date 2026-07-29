import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { getSessionUserId } from '../_lib/session.js'

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!
const TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getSessionUserId(req)
  if (!userId) return res.redirect('/login')

  const { code } = req.query
  if (!code || typeof code !== 'string') return res.redirect('/settings?strava=error')

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
      console.error('Strava token exchange failed:', await response.text())
      return res.redirect('/settings?strava=error')
    }

    const data = await response.json()
    const { access_token, refresh_token, expires_at, athlete } = data

    const { error } = await supabase.from('strava_connections').upsert({
      user_id: userId,
      athlete_id: athlete.id,
      access_token,
      refresh_token,
      expires_at,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) {
      console.error('Failed to store Strava connection:', error)
      return res.redirect('/settings?strava=error')
    }

    return res.redirect('/settings?strava=connected')
  } catch (err) {
    console.error('Strava callback error:', err)
    return res.redirect('/settings?strava=error')
  }
}
