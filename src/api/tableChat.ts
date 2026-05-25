export interface TableChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AITableSpec {
  title: string
  description?: string
  headers: string[]
  rows: string[][]
}

export async function sendTableChatMessage(
  message: string,
  history: TableChatMessage[],
  activityData: string,
  signal?: AbortSignal,
): Promise<Response> {
  const res = await fetch('/api/table-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, activityData }),
    signal,
  })
  if (!res.ok) throw new Error(`Table chat error: ${res.status}`)
  return res
}
