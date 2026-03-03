import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { sendCoachChat, loadCoachChatHistory } from '../api/coach'
import { saveCoachPlan } from '../api/coach'
import type { CoachWeek, CoachChatMessage } from '../store/types'

/**
 * Hook for coach chat functionality.
 * Lazy-loads chat history on first mount, provides sendMessage for new messages.
 */
export function useCoachChat() {
  const coachPlan = useAppStore((s) => s.coachPlan)
  const athlete = useAppStore((s) => s.athlete)
  const messages = useAppStore((s) => s.coachChatMessages)
  const loading = useAppStore((s) => s.coachChatLoading)
  const setMessages = useAppStore((s) => s.setCoachChatMessages)
  const addMessage = useAppStore((s) => s.addCoachChatMessage)
  const setLoading = useAppStore((s) => s.setCoachChatLoading)
  const setCoachPlan = useAppStore((s) => s.setCoachPlan)

  const historyLoaded = useRef(false)

  // Lazy-load chat history on first mount
  useEffect(() => {
    if (historyLoaded.current || !coachPlan || !athlete) return
    historyLoaded.current = true

    loadCoachChatHistory(coachPlan.id, athlete.id)
      .then((msgs) => {
        if (msgs.length > 0) setMessages(msgs)
      })
      .catch(() => {
        // Silently fail — table may not exist yet
      })
  }, [coachPlan, athlete, setMessages])

  // Build plan context string for Claude
  const buildPlanContext = useCallback(() => {
    if (!coachPlan) return ''

    const today = new Date().toISOString().split('T')[0]
    const currentWeekIdx = coachPlan.weeks.findIndex((w) =>
      w.days.some((d) => d.date === today)
    )
    const currentWeek = currentWeekIdx >= 0 ? currentWeekIdx + 1 : 1

    // Include current + remaining weeks (not past weeks)
    const relevantWeeks = coachPlan.weeks.filter((w) => w.weekNumber >= currentWeek)

    return `Race: ${coachPlan.raceDistance} on ${coachPlan.raceDate}
Goal: ${coachPlan.raceGoal}${coachPlan.goalTimeSeconds ? ` (${Math.floor(coachPlan.goalTimeSeconds / 3600)}h${Math.floor((coachPlan.goalTimeSeconds % 3600) / 60)}m)` : ''}
Current week: ${currentWeek} of ${coachPlan.planWeeks}
Remaining plan:\n${JSON.stringify(relevantWeeks, null, 2)}`
  }, [coachPlan])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !coachPlan || !athlete || loading) return

      // Optimistically add user message
      const userMsg: CoachChatMessage = {
        id: `temp-${Date.now()}`,
        planId: coachPlan.id,
        athleteId: athlete.id,
        role: 'user',
        content: text.trim(),
        planModified: false,
        createdAt: new Date().toISOString(),
      }
      addMessage(userMsg)
      setLoading(true)

      try {
        // Send last 20 messages as history
        const history = messages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const result = await sendCoachChat(
          coachPlan.id,
          athlete.id,
          text.trim(),
          history,
          buildPlanContext()
        )

        // Add assistant message
        const assistantMsg: CoachChatMessage = {
          id: `temp-${Date.now()}-assistant`,
          planId: coachPlan.id,
          athleteId: athlete.id,
          role: 'assistant',
          content: result.message,
          planModified: result.planModified,
          createdAt: new Date().toISOString(),
        }
        addMessage(assistantMsg)

        // If plan was modified, merge updated weeks
        if (result.planModified && result.updatedWeeks) {
          const updatedWeeks = coachPlan.weeks.map((existingWeek) => {
            const updated = (result.updatedWeeks as CoachWeek[])?.find(
              (w) => w.weekNumber === existingWeek.weekNumber
            )
            return updated ?? existingWeek
          })
          const updatedPlan = { ...coachPlan, weeks: updatedWeeks }
          setCoachPlan(updatedPlan)
          // Persist to Supabase
          saveCoachPlan(athlete.id, updatedPlan).catch(() => {})
        }
      } catch (err) {
        // Add error message
        const errorMsg: CoachChatMessage = {
          id: `temp-${Date.now()}-error`,
          planId: coachPlan.id,
          athleteId: athlete.id,
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
          planModified: false,
          createdAt: new Date().toISOString(),
        }
        addMessage(errorMsg)
      } finally {
        setLoading(false)
      }
    },
    [coachPlan, athlete, messages, loading, addMessage, setLoading, setCoachPlan, buildPlanContext]
  )

  return { messages, loading, sendMessage }
}
