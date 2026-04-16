import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/google-callback'
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code, state: athleteId } = req.query
  if (!code || !athleteId) {
    return res.status(400).json({ error: 'Missing code or athlete_id' })
  }

  try {
    const { tokens } = await oauth2Client.getToken(String(code))

    // Store tokens in Supabase
    const { error } = await supabase
      .from('google_tokens')
      .upsert({
        athlete_id: Number(athleteId),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'athlete_id' })

    if (error) {
      console.error('Failed to store Google tokens:', error)
      return res.status(500).json({ error: 'Failed to store tokens' })
    }

    // Redirect back to the app with a success indicator
    return res.redirect('/?gcal=connected')
  } catch (err: any) {
    console.error('Google OAuth error:', err.message)
    return res.status(500).json({ error: 'Failed to exchange Google code' })
  }
}
