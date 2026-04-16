import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/google-callback'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

// ── Token helpers ─────────────────────────────────────────────────────────────

async function getAccessToken(athleteId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('athlete_id', athleteId)
    .single()

  if (error || !data) return null

  // Refresh if expired (60s buffer)
  if (data.expiry_date < Date.now() + 60_000) {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: data.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    if (!refreshRes.ok) return null
    const refreshed = await refreshRes.json()
    await supabase
      .from('google_tokens')
      .update({
        access_token: refreshed.access_token,
        expiry_date: Date.now() + refreshed.expires_in * 1000,
        updated_at: new Date().toISOString(),
      })
      .eq('athlete_id', athleteId)
    return refreshed.access_token
  }

  return data.access_token
}

// ── Calendar event helpers ────────────────────────────────────────────────────

function buildEventTitle(activity: any): string {
  switch (activity.type) {
    case 'Run': return `${activity.targetDistance} Mile Run`
    case 'Race': return activity.name || `Race${activity.distance ? ` — ${activity.distance}` : ''}`
    case 'WeightTraining': return `Weight Training — ${activity.workoutType || 'Workout'}`
    case 'Yoga': return 'Yoga'
    case 'Tennis': return 'Tennis'
    case 'Rest': return 'Rest Day'
    default: return 'Workout'
  }
}

function buildEventDescription(activity: any): string {
  const lines: string[] = []
  if (activity.type === 'Run' && activity.targetPace && activity.targetPace !== '0:00')
    lines.push(`Target pace: ${activity.targetPace} /mi`)
  if (activity.type === 'Race') {
    if (activity.distance) lines.push(`Distance: ${activity.distance}`)
    if (activity.goalTime) lines.push(`Goal time: ${activity.goalTime}`)
    if (activity.targetPace) lines.push(`Target pace: ${activity.targetPace} /mi`)
  }
  if (activity.type === 'WeightTraining' && activity.exercises?.length) {
    lines.push('Exercises:')
    for (const ex of activity.exercises)
      lines.push(`  • ${ex.name} — ${ex.sets}×${ex.reps}${ex.notes ? ` (${ex.notes})` : ''}`)
  }
  if (activity.notes) { if (lines.length) lines.push(''); lines.push(activity.notes) }
  return lines.join('\n')
}

async function calendarFetch(method: string, path: string, token: string, body?: object) {
  return fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleAuth(req: VercelRequest, res: VercelResponse) {
  const { athlete_id } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: String(athlete_id),
  })
  return res.status(200).json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
}

async function handleCallback(req: VercelRequest, res: VercelResponse) {
  const { code, state: athleteId } = req.query
  if (!code || !athleteId) return res.status(400).json({ error: 'Missing code or state' })

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
    console.error('Token exchange error:', await tokenRes.text())
    return res.status(500).json({ error: 'Failed to exchange code' })
  }
  const tokens = await tokenRes.json()
  const { error } = await supabase.from('google_tokens').upsert({
    athlete_id: Number(athleteId),
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: Date.now() + tokens.expires_in * 1000,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'athlete_id' })

  if (error) { console.error('Supabase error:', error); return res.status(500).json({ error: 'Failed to store tokens' }) }
  return res.redirect('/?gcal=connected')
}

async function handleSync(req: VercelRequest, res: VercelResponse) {
  const { athlete_id } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })
  const athleteId = Number(athlete_id)

  // GET — check connection status
  if (req.method === 'GET') {
    const { data } = await supabase.from('google_tokens').select('athlete_id').eq('athlete_id', athleteId).single()
    return res.status(200).json({ connected: !!data })
  }

  // POST — upsert or delete event
  if (req.method === 'POST') {
    const { activity, date, action } = req.body
    const accessToken = await getAccessToken(athleteId)
    if (!accessToken) return res.status(401).json({ error: 'Google Calendar not connected' })

    const activityId = activity?.id

    if (action === 'delete' && activityId) {
      const { data: mapping } = await supabase
        .from('google_calendar_events').select('google_event_id')
        .eq('athlete_id', athleteId).eq('activity_id', activityId).single()
      if (mapping?.google_event_id) {
        const r = await calendarFetch('DELETE', `/calendars/primary/events/${mapping.google_event_id}`, accessToken)
        if (!r.ok && r.status !== 404 && r.status !== 410) console.error('Delete error:', r.status)
        await supabase.from('google_calendar_events').delete().eq('athlete_id', athleteId).eq('activity_id', activityId)
      }
      return res.status(200).json({ ok: true })
    }

    if (!activity || !date) return res.status(400).json({ error: 'Missing activity or date' })
    if (activity.type === 'Rest') return res.status(200).json({ ok: true, skipped: true })

    const time = activity.scheduledTime || '07:00'
    const [h, m] = time.split(':').map(Number)
    const startDate = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
    const endDate = new Date(startDate.getTime() + 3_600_000)
    const eventBody = {
      summary: buildEventTitle(activity),
      description: buildEventDescription(activity),
      start: { dateTime: startDate.toISOString(), timeZone: 'America/New_York' },
      end: { dateTime: endDate.toISOString(), timeZone: 'America/New_York' },
    }

    const { data: existing } = await supabase
      .from('google_calendar_events').select('google_event_id')
      .eq('athlete_id', athleteId).eq('activity_id', activityId).single()

    if (existing?.google_event_id) {
      const r = await calendarFetch('PUT', `/calendars/primary/events/${existing.google_event_id}`, accessToken, eventBody)
      if (!r.ok) { console.error('Update error:', r.status, await r.text()); return res.status(500).json({ error: 'Failed to update event' }) }
      return res.status(200).json({ ok: true, updated: true })
    } else {
      const r = await calendarFetch('POST', '/calendars/primary/events', accessToken, eventBody)
      if (!r.ok) { console.error('Create error:', r.status, await r.text()); return res.status(500).json({ error: 'Failed to create event' }) }
      const event = await r.json()
      await supabase.from('google_calendar_events').upsert({
        athlete_id: athleteId, activity_id: activityId, google_event_id: event.id, date,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'athlete_id,activity_id' })
      return res.status(200).json({ ok: true, created: true, eventId: event.id })
    }
  }

  // DELETE — disconnect
  if (req.method === 'DELETE') {
    await supabase.from('google_tokens').delete().eq('athlete_id', athleteId)
    await supabase.from('google_calendar_events').delete().eq('athlete_id', athleteId)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = String(req.query.path ?? '')

  if (path === 'auth') return handleAuth(req, res)
  if (path === 'callback') return handleCallback(req, res)
  if (path === 'sync') return handleSync(req, res)

  return res.status(400).json({ error: 'Missing or invalid path' })
}
