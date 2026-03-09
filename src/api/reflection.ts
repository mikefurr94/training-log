import type { ReflectionConversation, ReflectionMessage } from '../store/types'

export async function fetchConversations(athleteId: number): Promise<ReflectionConversation[]> {
  const res = await fetch(`/api/reflection?athlete_id=${athleteId}`)
  if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`)
  const data = await res.json()
  return data.conversations ?? []
}

export async function fetchMessages(athleteId: number, conversationId: string): Promise<ReflectionMessage[]> {
  const res = await fetch(`/api/reflection?athlete_id=${athleteId}&conversation_id=${conversationId}`)
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`)
  const data = await res.json()
  return data.messages ?? []
}

export async function sendReflectionMessage(
  athleteId: number,
  conversationId: string | null,
  message: string,
  history: { role: string; content: string }[],
  signal?: AbortSignal,
): Promise<Response> {
  const res = await fetch('/api/reflection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      athlete_id: athleteId,
      conversation_id: conversationId,
      message,
      history,
    }),
    signal,
  })
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`)
  return res
}

export async function deleteConversationApi(conversationId: string): Promise<void> {
  const res = await fetch(`/api/reflection?conversation_id=${conversationId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`)
}
