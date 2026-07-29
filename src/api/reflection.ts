import { apiFetch } from './client'
import type { ReflectionConversation, ReflectionMessage } from '../store/types'

export async function fetchConversations(): Promise<ReflectionConversation[]> {
  const res = await apiFetch('/api/reflection')
  if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`)
  const data = await res.json()
  return data.conversations ?? []
}

export async function fetchMessages(conversationId: string): Promise<ReflectionMessage[]> {
  const res = await apiFetch(`/api/reflection?conversation_id=${conversationId}`)
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`)
  const data = await res.json()
  return data.messages ?? []
}

export async function sendReflectionMessage(
  conversationId: string | null,
  message: string,
  history: { role: string; content: string }[],
  signal?: AbortSignal,
): Promise<Response> {
  const res = await apiFetch('/api/reflection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
  const res = await apiFetch(`/api/reflection?conversation_id=${conversationId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`)
}
