import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { plan_id, date, weekContext, activity } = req.body
  if (!plan_id || !date || !weekContext || !activity) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const prompt = `Provide detailed workout instructions for ${date} in week ${weekContext.weekNumber} (${weekContext.phase} phase) of a training plan.

Week context: ${weekContext.summary}
Activity: ${activity.label}${activity.targetDistanceMiles ? ` - ${activity.targetDistanceMiles} miles` : ''}${activity.intensity ? ` at ${activity.intensity} intensity` : ''}

Provide specific instructions including:
- Warm-up protocol
- Main workout details (splits, paces, reps if intervals, or specific exercises/sets/reps for strength)
- Cool-down
- Effort/heart rate guidance
- Notes on what to feel/focus on

Keep the response concise but actionable. Use plain text formatting with line breaks.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const detail = message.content[0].type === 'text' ? message.content[0].text : ''

    // Cache the detail in the plan's weekly_plan JSONB
    try {
      const { data: planRow } = await supabase
        .from('coach_plans')
        .select('weekly_plan')
        .eq('id', plan_id)
        .single()

      if (planRow?.weekly_plan?.weeks) {
        const weeks = planRow.weekly_plan.weeks.map((week: { days: { date: string; detailGenerated: boolean; activities: { id: string; label: string; detail?: string }[] }[] }) => ({
          ...week,
          days: week.days.map((day: { date: string; detailGenerated: boolean; activities: { id: string; label: string; detail?: string }[] }) =>
            day.date === date
              ? {
                  ...day,
                  detailGenerated: true,
                  activities: day.activities.map((a: { id: string; label: string; detail?: string }) =>
                    a.label === activity.label ? { ...a, detail } : a
                  ),
                }
              : day
          ),
        }))

        await supabase
          .from('coach_plans')
          .update({ weekly_plan: { weeks }, updated_at: new Date().toISOString() })
          .eq('id', plan_id)
      }
    } catch (err) {
      console.error('Failed to cache detail:', err)
    }

    return res.status(200).json({ detail })
  } catch (err) {
    console.error('Detail generation error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to generate detail',
    })
  }
}
