import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { weeksCompleted } = req.body
  if (!weeksCompleted) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const prompt = `You are a marathon training coach reviewing an athlete's recent training progress.

Here is the data for the completed weeks (planned vs actual):
${JSON.stringify(weeksCompleted, null, 2)}

Provide a brief, encouraging check-in with:
1. A summary of how they're doing (completion rate, consistency)
2. What's going well
3. Any concerns or areas to watch
4. 1-2 specific, actionable suggestions for the upcoming week

Keep the tone supportive and motivating. Be specific to their data. Keep the response under 200 words.

Return a JSON object:
{
  "suggestions": "Your check-in message here as a single string with line breaks"
}

Return ONLY the JSON object.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse AI response' })
    }

    const result = JSON.parse(jsonMatch[0])
    return res.status(200).json(result)
  } catch (err) {
    console.error('Checkin error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to generate check-in',
    })
  }
}
