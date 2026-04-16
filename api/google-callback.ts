import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/google-callback'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code, state: athleteId } = req.query
  if (!code || !athleteId) {
    return res.status(400).json({ error: 'Missing code or athlete_id' })
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Google token exchange error:', err)
      return res.status(500).json({ error: 'Failed to exchange code' })
    }

    const tokens = await tokenRes.json()
    const expiryDate = Date.now() + tokens.expires_in * 1000

    const { error } = await supabase
      .from('google_tokens')
      .upsert({
        athlete_id: Number(athleteId),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: expiryDate,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'athlete_id' })

    if (error) {
      console.error('Failed to store Google tokens:', error)
      return res.status(500).json({ error: 'Failed to store tokens' })
    }

    return res.redirect('/?gcal=connected')
  } catch (err: any) {
    console.error('Google OAuth error:', err.message)
    return res.status(500).json({ error: 'Failed to exchange Google code' })
  }
}
