import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

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
    const expiryDate = Date.now() + refreshed.expires_in * 1000

    await supabase
      .from('google_tokens')
      .update({
        access_token: refreshed.access_token,
        expiry_date: expiryDate,
        updated_at: new Date().toISOString(),
      })
      .eq('athlete_id', athleteId)

    return refreshed.access_token
  }

  return data.access_token
}

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
  if (activity.type === 'Run') {
    if (activity.targetPace && activity.targetPace !== '0:00') lines.push(`Target pace: ${activity.targetPace} /mi`)
  }
  if (activity.type === 'Race') {
    if (activity.distance) lines.push(`Distance: ${activity.distance}`)
    if (activity.goalTime) lines.push(`Goal time: ${activity.goalTime}`)
    if (activity.targetPace) lines.push(`Target pace: ${activity.targetPace} /mi`)
  }
  if (activity.type === 'WeightTraining' && activity.exercises?.length) {
    lines.push('Exercises:')
    for (const ex of activity.exercises) {
      lines.push(`  • ${ex.name} — ${ex.sets}×${ex.reps}${ex.notes ? ` (${ex.notes})` : ''}`)
    }
  }
  if (activity.notes) {
    if (lines.length) lines.push('')
    lines.push(activity.notes)
  }
  return lines.join('\n')
}

async function calendarFetch(method: string, path: string, accessToken: string, body?: object) {
  return fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { athlete_id } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })
  const athleteId = Number(athlete_id)

  // GET — check connection status
  if (req.method === 'GET') {
    const { data } = await supabase
      .from('google_tokens')
      .select('athlete_id')
      .eq('athlete_id', athleteId)
      .single()
    return res.status(200).json({ connected: !!data })
  }

  // POST — upsert or delete calendar event
  if (req.method === 'POST') {
    const { activity, date, action } = req.body

    const accessToken = await getAccessToken(athleteId)
    if (!accessToken) return res.status(401).json({ error: 'Google Calendar not connected' })

    const activityId = activity?.id

    if (action === 'delete' && activityId) {
      const { data: mapping } = await supabase
        .from('google_calendar_events')
        .select('google_event_id')
        .eq('athlete_id', athleteId)
        .eq('activity_id', activityId)
        .single()

      if (mapping?.google_event_id) {
        const deleteRes = await calendarFetch('DELETE', `/calendars/primary/events/${mapping.google_event_id}`, accessToken)
        if (!deleteRes.ok && deleteRes.status !== 404 && deleteRes.status !== 410) {
          console.error('Failed to delete calendar event:', deleteRes.status)
        }
        await supabase
          .from('google_calendar_events')
          .delete()
          .eq('athlete_id', athleteId)
          .eq('activity_id', activityId)
      }
      return res.status(200).json({ ok: true })
    }

    if (!activity || !date) return res.status(400).json({ error: 'Missing activity or date' })
    if (activity.type === 'Rest') return res.status(200).json({ ok: true, skipped: true })

    const time = activity.scheduledTime || '07:00'
    const [hours, minutes] = time.split(':').map(Number)
    const startDate = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

    const eventBody = {
      summary: buildEventTitle(activity),
      description: buildEventDescription(activity),
      start: { dateTime: startDate.toISOString(), timeZone: 'America/New_York' },
      end: { dateTime: endDate.toISOString(), timeZone: 'America/New_York' },
    }

    const { data: existing } = await supabase
      .from('google_calendar_events')
      .select('google_event_id')
      .eq('athlete_id', athleteId)
      .eq('activity_id', activityId)
      .single()

    try {
      if (existing?.google_event_id) {
        const updateRes = await calendarFetch('PUT', `/calendars/primary/events/${existing.google_event_id}`, accessToken, eventBody)
        if (!updateRes.ok) {
          console.error('Calendar update error:', updateRes.status, await updateRes.text())
          return res.status(500).json({ error: 'Failed to update calendar event' })
        }
        return res.status(200).json({ ok: true, updated: true })
      } else {
        const createRes = await calendarFetch('POST', '/calendars/primary/events', accessToken, eventBody)
        if (!createRes.ok) {
          console.error('Calendar create error:', createRes.status, await createRes.text())
          return res.status(500).json({ error: 'Failed to create calendar event' })
        }
        const event = await createRes.json()
        await supabase
          .from('google_calendar_events')
          .upsert({
            athlete_id: athleteId,
            activity_id: activityId,
            google_event_id: event.id,
            date,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'athlete_id,activity_id' })
        return res.status(200).json({ ok: true, created: true, eventId: event.id })
      }
    } catch (err: any) {
      console.error('Google Calendar API error:', err.message)
      return res.status(500).json({ error: 'Failed to sync calendar event' })
    }
  }

  // DELETE — disconnect Google Calendar
  if (req.method === 'DELETE') {
    await supabase.from('google_tokens').delete().eq('athlete_id', athleteId)
    await supabase.from('google_calendar_events').delete().eq('athlete_id', athleteId)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
