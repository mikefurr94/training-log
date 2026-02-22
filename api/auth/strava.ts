import type { VercelRequest, VercelResponse } from '@vercel/node'

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const REDIRECT_URI = process.env.STRAVA_REDIRECT_URI!

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  res.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`)
}
