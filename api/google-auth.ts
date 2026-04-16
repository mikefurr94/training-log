import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/google-callback'
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { athlete_id } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: String(athlete_id),
  })

  return res.status(200).json({ url: authUrl })
}
