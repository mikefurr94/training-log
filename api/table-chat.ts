import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'render_table',
    description: 'Render a table in the table builder UI. Use this whenever the user asks to "show", "create", "build", or "display" a table of their data. Always call this tool to produce the table — do not just describe the data in text.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'A short descriptive title for the table, e.g. "Weekly Distance" or "Longest Runs"',
        },
        description: {
          type: 'string',
          description: 'One sentence describing what this table shows',
        },
        headers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Column header labels, e.g. ["Week", "Miles", "Activities", "Avg Pace"]',
        },
        rows: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
          description: 'Array of rows. Each row is an array of string cell values matching the headers.',
        },
      },
      required: ['title', 'headers', 'rows'],
    },
  },
]

// ── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(activityData: string): string {
  return `You are a data assistant for an athlete's training log. Your job is to create useful tables from their Strava activity data.

When the user asks for a table, ALWAYS call the render_table tool to produce it. Do not write the table in text — use the tool.

After calling the tool, write a brief 1–2 sentence summary of what the table shows and any interesting observations.

Here is the athlete's activity data (recent activities):
${activityData}

Guidelines:
- Use miles for distance unless the user asks for km.
- Format pace as M:SS/mi (e.g. 8:30).
- Format durations as Xh Ym or Xm (e.g. 1h 23m or 45m).
- Format dates as "Mon DD" or "Mon DD, YYYY".
- Weeks run Monday–Sunday.
- For weekly tables, sort newest first.
- Round numbers sensibly (1 decimal for miles, whole numbers for HR).
- If the data doesn't support the request, create the best table you can with available fields and note what's missing.
- Today's date is ${new Date().toISOString().slice(0, 10)}.`
}

// ── SSE Helper ───────────────────────────────────────────────────────────────

function sseWrite(res: VercelResponse, event: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, history, activityData } = req.body
  if (!message) return res.status(400).json({ error: 'Missing message' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claudeMessages: Anthropic.MessageParam[] = [
      ...((history ?? []) as { role: string; content: string }[]).map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    let continueLoop = true

    while (continueLoop) {
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: buildSystemPrompt(activityData ?? 'No activity data provided.'),
        tools: TOOLS,
        messages: claudeMessages,
      })

      let currentToolUse: { id: string; name: string; input: string } | null = null
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      let hasToolUse = false

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            hasToolUse = true
            currentToolUse = { id: event.content_block.id, name: event.content_block.name, input: '' }
            sseWrite(res, { type: 'tool_status', message: 'Building table…' })
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            sseWrite(res, { type: 'text', content: event.delta.text })
          } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
            currentToolUse.input += event.delta.partial_json
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolUse) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let parsed: any = {}
            try { parsed = JSON.parse(currentToolUse.input) } catch { /* empty */ }

            if (currentToolUse.name === 'render_table') {
              sseWrite(res, { type: 'table', spec: parsed })
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: currentToolUse.id,
              content: JSON.stringify({ success: true }),
            })
            currentToolUse = null
          }
        }
      }

      if (hasToolUse && toolResults.length > 0) {
        const finalMessage = await stream.finalMessage()
        claudeMessages.push({ role: 'assistant', content: finalMessage.content })
        claudeMessages.push({ role: 'user', content: toolResults })
        continueLoop = true
      } else {
        continueLoop = false
      }
    }

    sseWrite(res, { type: 'done' })
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('[table-chat] Error:', err)
    sseWrite(res, { type: 'error', message: String(err) })
    res.end()
  }
}
