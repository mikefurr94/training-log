import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../store/useAppStore'
import { useIsMobile } from '../hooks/useIsMobile'
import { useReflectionChat } from '../hooks/useReflectionChat'
import InlineChart from '../components/reflection/InlineChart'
import PlanBuilderForm from '../components/coach/PlanBuilderForm'
import CoachPlanGrid from '../components/coach/CoachPlanGrid'
import type { ReflectionMessage, ReflectionConversation, CoachView } from '../store/types'

// ── View Tab Bar ────────────────────────────────────────────────────────────

function ViewTabBar({ view, onChangeView, hasPlan, chatEnabled }: {
  view: CoachView
  onChangeView: (v: CoachView) => void
  hasPlan: boolean
  chatEnabled: boolean
}) {
  const tabs: { key: CoachView; label: string; show: boolean }[] = [
    { key: 'chat', label: 'Chat', show: chatEnabled },
    { key: 'plan', label: 'Plan', show: hasPlan },
    { key: 'intake', label: 'New Plan', show: true },
  ]

  return (
    <div style={{
      display: 'flex', gap: 2, padding: '6px 12px',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)', flexShrink: 0,
    }}>
      {tabs.filter((t) => t.show).map((t) => (
        <button
          key={t.key}
          onClick={() => onChangeView(t.key)}
          style={{
            padding: '5px 12px', borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-sm)', fontWeight: view === t.key ? 600 : 500,
            border: 'none', cursor: 'pointer',
            background: view === t.key ? 'var(--color-accent-light)' : 'transparent',
            color: view === t.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            transition: 'all 150ms ease',
          }}
        >{t.label}</button>
      ))}
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'How has my weekly mileage trended this year?',
  'What was my best running week?',
  'Compare this month vs last month',
  'How am I doing against my plan this week?',
]

function EmptyState({ onSend, onCreatePlan, hasPlan }: {
  onSend: (text: string) => void
  onCreatePlan: () => void
  hasPlan: boolean
}) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
        <h2 style={{
          fontSize: 'var(--font-size-lg)', fontWeight: 700,
          color: 'var(--color-text-primary)', margin: 0, marginBottom: 4,
        }}>Your Training Coach</h2>
        <p style={{
          fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
          margin: 0, maxWidth: 400,
        }}>
          Ask questions about your training, create race plans, and get personalized coaching insights.
        </p>
      </div>

      {!hasPlan && (
        <button
          onClick={onCreatePlan}
          style={{
            padding: '10px 20px', borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent)', color: 'var(--color-text-inverse)',
            border: 'none', fontSize: 'var(--font-size-sm)', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          + Create Training Plan
        </button>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 8, width: '100%', maxWidth: 500,
      }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSend(s)}
            style={{
              padding: '10px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)'
              e.currentTarget.style.color = 'var(--color-text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Chat Bubble ──────────────────────────────────────────────────────────────

const markdownStyles = `
  .reflection-md { font-size: var(--font-size-sm); line-height: 1.65; color: var(--color-text-primary); }
  .reflection-md > *:first-child { margin-top: 0 !important; }
  .reflection-md > *:last-child { margin-bottom: 0 !important; }
  .reflection-md p { margin: 0 0 10px; }
  .reflection-md h1, .reflection-md h2, .reflection-md h3 {
    font-weight: 700; margin: 16px 0 6px; color: var(--color-text-primary);
  }
  .reflection-md h1 { font-size: 1.1em; }
  .reflection-md h2 { font-size: 1.05em; }
  .reflection-md h3 { font-size: 1em; }
  .reflection-md hr { border: none; border-top: 1px solid var(--color-border); margin: 12px 0; }
  .reflection-md strong { font-weight: 700; }
  .reflection-md em { font-style: italic; }
  .reflection-md ul, .reflection-md ol { margin: 0 0 10px; padding-left: 20px; }
  .reflection-md li { margin: 3px 0; }
  .reflection-md code {
    font-family: monospace; font-size: 0.9em;
    background: rgba(0,0,0,0.06); border-radius: 4px; padding: 1px 5px;
  }
  .reflection-md pre {
    background: rgba(0,0,0,0.06); border-radius: 8px;
    padding: 10px 12px; overflow-x: auto; margin: 0 0 10px;
  }
  .reflection-md pre code { background: none; padding: 0; }
  .reflection-md table {
    border-collapse: collapse; width: 100%; margin: 0 0 10px;
    font-size: 0.9em;
  }
  .reflection-md th, .reflection-md td {
    border: 1px solid var(--color-border); padding: 6px 10px; text-align: left;
  }
  .reflection-md th { background: rgba(0,0,0,0.04); font-weight: 600; }
  .reflection-md tr:nth-child(even) td { background: rgba(0,0,0,0.02); }
`

function ChatBubble({ message }: { message: ReflectionMessage }) {
  const isUser = message.role === 'user'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      padding: '4px 0',
    }}>
      <style>{markdownStyles}</style>
      <div style={{
        maxWidth: '80%', padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'var(--color-accent)' : 'var(--color-surface)',
        color: isUser ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
        fontSize: 'var(--font-size-sm)', lineHeight: 1.5,
        border: isUser ? 'none' : '1px solid var(--color-border)',
        wordBreak: 'break-word',
      }}>
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
        ) : (
          <div className="reflection-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {message.charts && message.charts.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {message.charts.map((chart, i) => (
              <InlineChart key={i} spec={chart} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Streaming Indicator ──────────────────────────────────────────────────────

function StreamingIndicator({ toolStatus }: { toolStatus?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-start', padding: '4px 0',
    }}>
      <div style={{
        padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {toolStatus ? (
          <span>{toolStatus}</span>
        ) : (
          <span style={{ display: 'flex', gap: 3 }}>
            <DotAnimation />
          </span>
        )}
      </div>
    </div>
  )
}

function DotAnimation() {
  return (
    <>
      <style>{`
        @keyframes reflectDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--color-text-tertiary)',
          animation: `reflectDot 1.2s ease-in-out ${i * 0.15}s infinite`,
          display: 'inline-block',
        }} />
      ))}
    </>
  )
}

// ── Chat Input ───────────────────────────────────────────────────────────────

function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [text, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [text])

  return (
    <div style={{
      borderTop: '1px solid var(--color-border)',
      background: 'var(--color-surface)', flexShrink: 0,
    }}>
    <div style={{
      maxWidth: 760, margin: '0 auto', padding: '12px 16px',
      display: 'flex', gap: 8, alignItems: 'flex-end',
    }}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your training..."
        disabled={disabled}
        rows={1}
        style={{
          flex: 1, resize: 'none', padding: '8px 12px', borderRadius: 12,
          border: '1px solid var(--color-border)', background: 'var(--color-bg)',
          color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
          fontFamily: 'inherit', lineHeight: 1.5, outline: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: text.trim() && !disabled ? 'var(--color-accent)' : 'var(--color-border)',
          border: 'none', cursor: text.trim() && !disabled ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background var(--transition-fast)', flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
    </div>
  )
}

// ── Conversation Sidebar ─────────────────────────────────────────────────────

function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  conversations: ReflectionConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div style={{
      width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--color-border)', background: 'var(--color-bg)',
      height: '100%', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 12px 8px' }}>
        <button
          onClick={onNew}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
            fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all var(--transition-fast)',
          }}
        >
          <span style={{ fontSize: 14 }}>+</span> New chat
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
        {conversations.map((conv) => {
          const isActive = conv.id === activeId
          const isHovered = conv.id === hoveredId
          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', marginBottom: 2,
                background: isActive ? 'var(--color-accent-light)' : isHovered ? 'var(--color-border-light, rgba(0,0,0,0.04))' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background var(--transition-fast)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 'var(--font-size-sm)', fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{conv.title}</div>
                <div style={{
                  fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2,
                }}>{formatRelativeDate(conv.updatedAt)}</div>
              </div>
              {isHovered && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(conv.id) }}
                  style={{
                    width: 20, height: 20, borderRadius: 4, border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    color: 'var(--color-text-tertiary)', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Chat Panel (reusable for both full and side panel) ──────────────────────

function ChatPanel({
  messages,
  isStreaming,
  streamingContent,
  streamingCharts,
  toolStatus,
  sendMessage,
  hasMessages,
  onCreatePlan,
  hasPlan,
  compact,
}: {
  messages: ReflectionMessage[]
  isStreaming: boolean
  streamingContent: string
  streamingCharts: import('../store/types').ChartSpec[]
  toolStatus: string | null
  sendMessage: (text: string) => void
  hasMessages: boolean
  onCreatePlan: () => void
  hasPlan: boolean
  compact?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      minWidth: 0, height: '100%', overflow: 'hidden',
    }}>
      {hasMessages ? (
        <div ref={scrollRef} style={{
          flex: 1, overflow: 'auto', padding: compact ? '12px' : '16px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ maxWidth: compact ? undefined : 760, width: '100%', margin: compact ? undefined : '0 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && streamingContent && (
              <ChatBubble message={{
                id: 'streaming',
                role: 'assistant',
                content: streamingContent,
                charts: streamingCharts.length > 0 ? streamingCharts : undefined,
                createdAt: new Date().toISOString(),
              }} />
            )}
            {isStreaming && !streamingContent && (
              <StreamingIndicator toolStatus={toolStatus ?? undefined} />
            )}
          </div>
        </div>
      ) : (
        <EmptyState onSend={sendMessage} onCreatePlan={onCreatePlan} hasPlan={hasPlan} />
      )}

      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const isMobile = useIsMobile()
  const athleteId = useAppStore((s) => s.athlete?.id)
  const coachView = useAppStore((s) => s.coachView)
  const setCoachView = useAppStore((s) => s.setCoachView)
  const coachPlan = useAppStore((s) => s.coachPlan)

  const {
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
  } = useReflectionChat(athleteId ?? null)

  const [showSidebar, setShowSidebar] = useState(false)
  const featureFlags = useAppStore((s) => s.featureFlags)

  const hasMessages = messages.length > 0 || isStreaming
  const hasPlan = !!coachPlan

  // Auto-switch to plan view when a plan is saved
  const prevPlanRef = useRef(coachPlan)
  useEffect(() => {
    if (coachPlan && !prevPlanRef.current) {
      setCoachView('plan')
    }
    prevPlanRef.current = coachPlan
  }, [coachPlan, setCoachView])

  // If on plan view but no plan exists, redirect to intake
  useEffect(() => {
    if (coachView === 'plan' && !hasPlan) {
      setCoachView('intake')
    }
  }, [coachView, hasPlan, setCoachView])

  // If chat is disabled and on chat view, redirect to intake
  useEffect(() => {
    if (!featureFlags.chatEnabled && coachView === 'chat') {
      setCoachView('intake')
    }
  }, [featureFlags.chatEnabled, coachView, setCoachView])

  function handleIntakeSubmit(data: {
    raceName: string
    raceDate: string
    raceDistance: string
    goalTime: string
    targetPace: string
    planWeeks: number
    runDaysPerWeek: number
    liftDaysPerWeek: number
    currentWeeklyMileage: string
    experienceLevel: string
    notes: string
  }) {
    // Build a structured prompt from the form data
    const parts: string[] = [
      `Please create a ${data.planWeeks}-week training plan for my upcoming race.`,
      '',
      `Race: ${data.raceName}`,
      `Date: ${data.raceDate}`,
      `Distance: ${data.raceDistance}`,
    ]
    if (data.goalTime) parts.push(`Goal time: ${data.goalTime}`)
    if (data.targetPace) parts.push(`Target pace: ${data.targetPace}/mi`)
    parts.push('')
    parts.push(`Preferences:`)
    parts.push(`- ${data.runDaysPerWeek} run days per week`)
    parts.push(`- ${data.liftDaysPerWeek} lift days per week`)
    if (data.currentWeeklyMileage) parts.push(`- Current weekly mileage: ${data.currentWeeklyMileage} miles`)
    parts.push(`- Experience level: ${data.experienceLevel}`)
    if (data.notes) parts.push(`- Notes: ${data.notes}`)
    parts.push('')
    parts.push('Please generate the full week-by-week plan using the save_training_plan tool. Include progressive overload, appropriate rest days, and a taper period before the race.')

    // Switch to chat and send
    setCoachView('chat')
    startNewConversation()
    // Small delay to let the new conversation initialize
    setTimeout(() => sendMessage(parts.join('\n')), 100)
  }

  // ── Intake View ────────────────────────────────────────────────────────────

  if (coachView === 'intake') {
    return (
      <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
        <ViewTabBar view={coachView} onChangeView={setCoachView} hasPlan={hasPlan} chatEnabled={featureFlags.chatEnabled} />
        <PlanBuilderForm
          onSubmit={handleIntakeSubmit}
          onCancel={() => setCoachView('chat')}
        />
      </div>
    )
  }

  // ── Plan View ──────────────────────────────────────────────────────────────

  if (coachView === 'plan' && coachPlan) {
    if (isMobile) {
      return (
        <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
          <ViewTabBar view={coachView} onChangeView={setCoachView} hasPlan={hasPlan} chatEnabled={featureFlags.chatEnabled} />
          <CoachPlanGrid plan={coachPlan} />
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
        <ViewTabBar view={coachView} onChangeView={setCoachView} hasPlan={hasPlan} chatEnabled={featureFlags.chatEnabled} />
        <CoachPlanGrid plan={coachPlan} />
      </div>
    )
  }

  // ── Chat View (default) ────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', flex: 1, height: '100%', overflow: 'hidden', flexDirection: 'column',
    }}>
      <ViewTabBar view={coachView} onChangeView={setCoachView} hasPlan={hasPlan} chatEnabled={featureFlags.chatEnabled} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <ConversationSidebar
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={selectConversation}
            onNew={startNewConversation}
            onDelete={deleteConversation}
          />
        )}

        {/* Mobile sidebar overlay */}
        {isMobile && showSidebar && (
          <>
            <div onClick={() => setShowSidebar(false)} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50,
            }} />
            <div style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, zIndex: 51,
              background: 'var(--color-bg)',
            }}>
              <div style={{ padding: '12px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>Conversations</span>
                <button onClick={() => setShowSidebar(false)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <ConversationSidebar
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={(id) => { selectConversation(id); setShowSidebar(false) }}
                onNew={() => { startNewConversation(); setShowSidebar(false) }}
                onDelete={deleteConversation}
              />
            </div>
          </>
        )}

        {/* Chat area */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          minWidth: 0, height: '100%', overflow: 'hidden',
        }}>
          {/* Mobile chat header */}
          {isMobile && (
            <div style={{
              padding: '8px 12px', borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              background: 'var(--color-surface)',
            }}>
              <button onClick={() => setShowSidebar(true)} style={{
                width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)', background: 'transparent',
                cursor: 'pointer', color: 'var(--color-text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
              }}>☰</button>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {activeConversationId ? conversations.find(c => c.id === activeConversationId)?.title ?? 'Chat' : 'New chat'}
              </span>
              <div style={{ flex: 1 }} />
              <button onClick={startNewConversation} style={{
                padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)', background: 'transparent',
                cursor: 'pointer', color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
              }}>+ New</button>
            </div>
          )}

          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            streamingCharts={streamingCharts}
            toolStatus={toolStatus}
            sendMessage={sendMessage}
            hasMessages={hasMessages}
            onCreatePlan={() => setCoachView('intake')}
            hasPlan={hasPlan}
          />
        </div>
      </div>
    </div>
  )
}
