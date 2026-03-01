import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { request, context } = req.body
  if (!request || !context) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const prompt = `You are a marathon training coach. The athlete has asked you to adjust their training plan.

Current week: ${context.currentWeek}
Remaining plan weeks: ${JSON.stringify(context.remainingWeeks, null, 2)}

Athlete's request: "${request}"

Modify the remaining weeks as needed to accommodate the request. Return a JSON object with:
{
  "explanation": "Brief explanation of what you changed and why",
  "weeks": [... the modified remaining weeks in the same format as provided]
}

Return ONLY the JSON object.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
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
    console.error('Adjust error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to adjust plan',
    })
  }
}
