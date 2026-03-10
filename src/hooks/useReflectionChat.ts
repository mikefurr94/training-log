import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReflectionMessage, ReflectionConversation, ChartSpec, CoachPlan } from '../store/types'
import { useAppStore } from '../store/useAppStore'
import {
  fetchConversations,
  fetchMessages,
  sendReflectionMessage,
  deleteConversationApi,
} from '../api/reflection'

// Map snake_case DB row → camelCase CoachPlan
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCoachPlan(raw: any): CoachPlan {
  return {
    id: raw.id,
    athleteId: raw.athleteId ?? raw.athlete_id,
    name: raw.name,
    raceName: raw.raceName ?? raw.race_name ?? undefined,
    raceDate: raw.raceDate ?? raw.race_date ?? undefined,
    raceDistance: raw.raceDistance ?? raw.race_distance ?? undefined,
    goalTime: raw.goalTime ?? raw.goal_time ?? undefined,
    preferences: raw.preferences ?? {},
    weeks: raw.weeks ?? [],
    status: raw.status ?? 'active',
    conversationId: raw.conversationId ?? raw.conversation_id ?? undefined,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
  }
}

export function useReflectionChat(athleteId: number | null) {
  const [conversations, setConversations] = useState<ReflectionConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ReflectionMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingCharts, setStreamingCharts] = useState<ChartSpec[]>([])
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load conversations on mount
  useEffect(() => {
    if (!athleteId) return
    fetchConversations(athleteId).then(setConversations).catch(console.error)
  }, [athleteId])

  const selectConversation = useCallback(async (id: string) => {
    if (!athleteId) return
    setActiveConversationId(id)
    setMessages([])
    setStreamingContent('')
    setStreamingCharts([])
    try {
      const msgs = await fetchMessages(athleteId, id)
      setMessages(msgs)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }, [athleteId])

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null)
    setMessages([])
    setStreamingContent('')
    setStreamingCharts([])
    setToolStatus(null)
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await deleteConversationApi(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConversationId === id) {
        startNewConversation()
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }, [activeConversationId, startNewConversation])

  const sendMessage = useCallback(async (text: string) => {
    if (!athleteId || isStreaming) return

    // Optimistically add user message
    const userMsg: ReflectionMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    setStreamingContent('')
    setStreamingCharts([])
    setToolStatus(null)

    // Build history for context (last 20 messages)
    const history = messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const abort = new AbortController()
      abortRef.current = abort

      const response = await sendReflectionMessage(
        athleteId,
        activeConversationId,
        text,
        history,
        abort.signal,
      )

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let accContent = ''
      let accCharts: ChartSpec[] = []
      let convId = activeConversationId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const event = JSON.parse(data)

              switch (event.type) {
                case 'text':
                  accContent += event.content
                  setStreamingContent(accContent)
                  setToolStatus(null)
                  break
                case 'tool_status':
                  setToolStatus(event.message)
                  break
                case 'chart':
                  accCharts = [...accCharts, event.spec]
                  setStreamingCharts(accCharts)
                  break
                case 'conversation':
                  convId = event.id
                  setActiveConversationId(convId)
                  break
                case 'done': {
                  // Finalize the assistant message
                  const assistantMsg: ReflectionMessage = {
                    id: event.message_id ?? `msg-${Date.now()}`,
                    role: 'assistant',
                    content: accContent,
                    charts: accCharts.length > 0 ? accCharts : undefined,
                    createdAt: new Date().toISOString(),
                  }
                  setMessages((prev) => [...prev, assistantMsg])
                  setStreamingContent('')
                  setStreamingCharts([])

                  // Update conversation in sidebar
                  if (event.conversation) {
                    const conv: ReflectionConversation = event.conversation
                    setConversations((prev) => {
                      const without = prev.filter((c) => c.id !== conv.id)
                      return [conv, ...without]
                    })
                  }
                  break
                }
                case 'plan_saved':
                case 'plan_updated':
                  if (event.plan) {
                    useAppStore.getState().setCoachPlan(toCoachPlan(event.plan))
                    useAppStore.getState().setCoachView('plan')
                  }
                  break
                case 'error':
                  console.error('Stream error:', event.message)
                  break
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('Send message error:', err)
    } finally {
      setIsStreaming(false)
      setToolStatus(null)
      abortRef.current = null
    }
  }, [athleteId, activeConversationId, messages, isStreaming])

  return {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    streamingContent,
    streamingCharts,
    toolStatus,
    sendMessage,
    selectConversation,
    startNewConversation,
    deleteConversation,
  }
}
