import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { requireSession } from './_lib/session.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await requireSession(req, res)
  if (!userId) return

  const { plan_id } = req.query

  // GET — load active coach plan for this user
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('coach_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data ?? null)
  }

  // POST — create or replace active plan
  if (req.method === 'POST') {
    const body = req.body
    if (!body) return res.status(400).json({ error: 'Missing plan data' })

    // Archive any existing active plan for this user
    await supabase
      .from('coach_plans')
      .update({ status: 'archived' })
      .eq('user_id', userId)
      .eq('status', 'active')

    // Insert new plan
    const { data, error } = await supabase
      .from('coach_plans')
      .insert({
        user_id: userId,
        name: body.name,
        race_name: body.raceName ?? null,
        race_date: body.raceDate ?? null,
        race_distance: body.raceDistance ?? null,
        goal_time: body.goalTime ?? null,
        preferences: body.preferences ?? {},
        weeks: body.weeks ?? [],
        status: 'active',
        conversation_id: body.conversationId ?? null,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // PATCH — update specific fields of a plan
  if (req.method === 'PATCH') {
    if (!plan_id) return res.status(400).json({ error: 'Missing plan_id' })

    const body = req.body
    if (!body) return res.status(400).json({ error: 'Missing update data' })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.weeks !== undefined) updates.weeks = body.weeks
    if (body.status !== undefined) updates.status = body.status
    if (body.preferences !== undefined) updates.preferences = body.preferences
    if (body.conversationId !== undefined) updates.conversation_id = body.conversationId

    const { data, error } = await supabase
      .from('coach_plans')
      .update(updates)
      .eq('id', plan_id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // DELETE — archive a plan
  if (req.method === 'DELETE') {
    if (!plan_id) return res.status(400).json({ error: 'Missing plan_id' })

    const { error } = await supabase
      .from('coach_plans')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', plan_id)
      .eq('user_id', userId)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
