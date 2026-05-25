import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { startOfWeek, format, parseISO } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../store/useAppStore'
import type { StravaActivity } from '../store/types'
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatHeartRate,
  formatElevation,
  formatCalories,
  metersToMiles,
  metersToKm,
} from '../utils/formatters'
import { sendTableChatMessage } from '../api/tableChat'
import type { TableChatMessage, AITableSpec } from '../api/tableChat'

// ── Markdown renderer ─────────────────────────────────────────────────────────

const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p:          ({ children }) => <p style={{ margin: '0 0 10px', lineHeight: 1.65 }}>{children}</p>,
  ul:         ({ children }) => <ul style={{ margin: '2px 0 10px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ul>,
  ol:         ({ children }) => <ol style={{ margin: '2px 0 10px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ol>,
  li:         ({ children }) => <li style={{ lineHeight: 1.6 }}>{children}</li>,
  strong:     ({ children }) => <strong style={{ fontWeight: 600, color: 'inherit' }}>{children}</strong>,
  em:         ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  h1:         ({ children }) => <h1 style={{ fontSize: 15, fontWeight: 700, margin: '14px 0 6px', color: 'var(--color-text-primary)' }}>{children}</h1>,
  h2:         ({ children }) => <h2 style={{ fontSize: 14, fontWeight: 700, margin: '12px 0 5px', color: 'var(--color-text-primary)' }}>{children}</h2>,
  h3:         ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 600, margin: '10px 0 4px', color: 'var(--color-text-primary)' }}>{children}</h3>,
  code:       ({ children, className }) => className
    ? <code style={{ display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: 12, background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '10px 12px', overflowX: 'auto', margin: '6px 0', lineHeight: 1.6 }}>{children}</code>
    : <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, background: 'rgba(0,0,0,0.07)', borderRadius: 3, padding: '1px 5px' }}>{children}</code>,
  pre:        ({ children }) => <>{children}</>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--color-border)', margin: '6px 0', paddingLeft: 12, color: 'var(--color-text-secondary)' }}>{children}</blockquote>,
  hr:         () => <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '12px 0' }} />,
  a:          ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>{children}</a>,
}

// ── Shared table chrome ───────────────────────────────────────────────────────

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} style={{
              padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
              color: 'var(--color-text-tertiary)', letterSpacing: '0.5px', textTransform: 'uppercase',
              whiteSpace: 'nowrap', position: 'sticky', top: 0,
              background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
            {row.map((cell, j) => (
              <td key={j} style={{
                padding: '9px 16px',
                color: j === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: j === 0 ? 500 : 400, whiteSpace: 'nowrap',
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EmptyState() {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>No activities loaded yet.</div>
}

// ── View: Distance per Week ───────────────────────────────────────────────────

function DistancePerWeek({ activities, unit }: { activities: StravaActivity[]; unit: 'mi' | 'km' }) {
  const rows = useMemo(() => {
    const byWeek = new Map<string, { weekStart: Date; distance: number; count: number; movingTime: number }>()
    for (const a of activities) {
      const weekStart = startOfWeek(parseISO(a.start_date_local), { weekStartsOn: 1 })
      const key = format(weekStart, 'yyyy-MM-dd')
      const e = byWeek.get(key) ?? { weekStart, distance: 0, count: 0, movingTime: 0 }
      e.distance += a.distance; e.count += 1; e.movingTime += a.moving_time
      byWeek.set(key, e)
    }
    return Array.from(byWeek.values())
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
      .map(({ weekStart, distance, count, movingTime }) => {
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
        return [
          `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`,
          unit === 'mi' ? `${metersToMiles(distance).toFixed(1)} mi` : `${metersToKm(distance).toFixed(1)} km`,
          count,
          formatDuration(movingTime),
        ]
      })
  }, [activities, unit])
  if (!rows.length) return <EmptyState />
  return <DataTable headers={['Week', unit === 'mi' ? 'Miles' : 'Kilometers', 'Activities', 'Moving Time']} rows={rows} />
}

// ── View: Activity Mix ────────────────────────────────────────────────────────

function ActivityMix({ activities, unit }: { activities: StravaActivity[]; unit: 'mi' | 'km' }) {
  const rows = useMemo(() => {
    const byType = new Map<string, { count: number; distance: number; movingTime: number; totalSpeed: number; speedCount: number; totalHR: number; hrCount: number }>()
    for (const a of activities) {
      const type = a.sport_type || a.type || 'Other'
      const e = byType.get(type) ?? { count: 0, distance: 0, movingTime: 0, totalSpeed: 0, speedCount: 0, totalHR: 0, hrCount: 0 }
      e.count += 1; e.distance += a.distance; e.movingTime += a.moving_time
      if (a.average_speed > 0) { e.totalSpeed += a.average_speed; e.speedCount += 1 }
      if (a.average_heartrate) { e.totalHR += a.average_heartrate; e.hrCount += 1 }
      byType.set(type, e)
    }
    return Array.from(byType.entries())
      .sort((a, b) => b[1].distance - a[1].distance)
      .map(([type, { count, distance, movingTime, totalSpeed, speedCount, totalHR, hrCount }]) => [
        type, count, formatDistance(distance, unit), formatDuration(movingTime),
        speedCount > 0 ? formatPace(totalSpeed / speedCount, unit) : '—',
        hrCount > 0 ? formatHeartRate(totalHR / hrCount) : '—',
      ])
  }, [activities, unit])
  if (!rows.length) return <EmptyState />
  return <DataTable headers={['Type', 'Count', 'Total Distance', 'Total Time', 'Avg Pace', 'Avg HR']} rows={rows} />
}

// ── View: All Activities ──────────────────────────────────────────────────────

const ALL_COLUMNS = [
  { key: 'date',         label: 'Date',         render: (a: StravaActivity, _u: 'mi'|'km') => new Date(a.start_date_local).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
  { key: 'name',         label: 'Name',         render: (a: StravaActivity, _u: 'mi'|'km') => a.name },
  { key: 'type',         label: 'Type',         render: (a: StravaActivity, _u: 'mi'|'km') => a.sport_type || a.type },
  { key: 'distance',     label: 'Distance',     render: (a: StravaActivity, u: 'mi'|'km') => formatDistance(a.distance, u) },
  { key: 'moving_time',  label: 'Moving Time',  render: (a: StravaActivity, _u: 'mi'|'km') => formatDuration(a.moving_time) },
  { key: 'elapsed_time', label: 'Elapsed Time', render: (a: StravaActivity, _u: 'mi'|'km') => formatDuration(a.elapsed_time) },
  { key: 'pace',         label: 'Avg Pace',     render: (a: StravaActivity, u: 'mi'|'km') => formatPace(a.average_speed, u) },
  { key: 'elevation',    label: 'Elevation',    render: (a: StravaActivity, u: 'mi'|'km') => formatElevation(a.total_elevation_gain, u) },
  { key: 'avg_hr',       label: 'Avg HR',       render: (a: StravaActivity, _u: 'mi'|'km') => formatHeartRate(a.average_heartrate) },
  { key: 'max_hr',       label: 'Max HR',       render: (a: StravaActivity, _u: 'mi'|'km') => formatHeartRate(a.max_heartrate) },
  { key: 'avg_watts',    label: 'Avg Watts',    render: (a: StravaActivity, _u: 'mi'|'km') => a.average_watts != null ? `${Math.round(a.average_watts)} W` : '—' },
  { key: 'kilojoules',   label: 'Kilojoules',   render: (a: StravaActivity, _u: 'mi'|'km') => a.kilojoules != null ? `${Math.round(a.kilojoules)} kJ` : '—' },
  { key: 'calories',     label: 'Calories',     render: (a: StravaActivity, _u: 'mi'|'km') => formatCalories(a.calories) },
]
const DEFAULT_COLUMNS = ['date', 'name', 'type', 'distance', 'moving_time', 'pace']

function AllActivities({ activities, unit }: { activities: StravaActivity[]; unit: 'mi' | 'km' }) {
  const [selectedCols, setSelectedCols] = useState<string[]>(DEFAULT_COLUMNS)
  const [pickerOpen, setPickerOpen] = useState(false)
  const visibleCols = ALL_COLUMNS.filter((c) => selectedCols.includes(c.key))
  const toggle = (key: string) => setSelectedCols((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key])

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{activities.length} activities</span>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setPickerOpen((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 7, border: '1px solid var(--color-border)', background: pickerOpen ? 'var(--color-accent-light)' : 'transparent', color: pickerOpen ? 'var(--color-accent)' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            Columns ({selectedCols.length})
          </button>
          {pickerOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 0', minWidth: 180, boxShadow: '0 6px 24px rgba(0,0,0,0.12)', zIndex: 50 }}>
              <div style={{ padding: '2px 12px 8px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Columns</div>
              {ALL_COLUMNS.map((col) => {
                const checked = selectedCols.includes(col.key)
                return (
                  <button key={col.key} onClick={() => toggle(col.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 15, height: 15, borderRadius: 4, border: `2px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`, background: checked ? 'var(--color-accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {checked && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3" /></svg>}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: checked ? 500 : 400 }}>{col.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activities.length === 0 ? <EmptyState /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{visibleCols.map((col) => <th key={col.key} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>{col.label}</th>)}</tr>
            </thead>
            <tbody>
              {activities.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                  {visibleCols.map((col) => <td key={col.key} style={{ padding: '9px 16px', color: col.key === 'name' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: col.key === 'name' ? 500 : 400, whiteSpace: col.key === 'name' ? 'normal' : 'nowrap' }}>{col.render(a, unit)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pickerOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setPickerOpen(false)} />}
    </>
  )
}

// ── Chat primitives ───────────────────────────────────────────────────────────

function AssistantMessage({ content }: { content: string }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-primary)' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

function ChatBubble({ msg }: { msg: TableChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1px 0' }}>
        <div style={{
          maxWidth: '82%', padding: '9px 14px',
          borderRadius: '16px 16px 4px 16px',
          background: 'var(--color-accent)', color: 'white',
          fontSize: 14, lineHeight: 1.55,
        }}>
          {msg.content}
        </div>
      </div>
    )
  }
  return (
    <div style={{ padding: '2px 0' }}>
      <AssistantMessage content={msg.content} />
    </div>
  )
}

function TypingIndicator({ content, toolStatus }: { content: string; toolStatus: string | null }) {
  if (toolStatus && !content) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
        <span style={{ display: 'inline-flex', gap: 3 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--color-text-tertiary)',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              display: 'inline-block',
            }} />
          ))}
        </span>
        <span>{toolStatus}</span>
      </div>
    )
  }
  if (content) {
    return <div style={{ padding: '2px 0' }}><AssistantMessage content={content} /></div>
  }
  return (
    <div style={{ display: 'flex', gap: 4, padding: '8px 0', alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--color-text-tertiary)',
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          display: 'inline-block',
        }} />
      ))}
    </div>
  )
}

function ChatInput({ onSend, disabled, placeholder = 'Ask for a table…' }: { onSend: (text: string) => void; disabled: boolean; placeholder?: string }) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function submit() {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    if (ref.current) { ref.current.style.height = 'auto' }
  }

  return (
    <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        placeholder={placeholder}
        rows={1}
        style={{
          flex: 1, resize: 'none', border: '1px solid var(--color-border)', borderRadius: 10,
          padding: '8px 11px', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.5,
          background: 'var(--color-bg)', color: 'var(--color-text-primary)',
          outline: 'none', overflowY: 'hidden',
        }}
      />
      <button
        onClick={submit}
        disabled={!value.trim() || disabled}
        style={{
          width: 34, height: 34, borderRadius: 9, border: 'none',
          cursor: value.trim() && !disabled ? 'pointer' : 'default',
          background: value.trim() && !disabled ? 'var(--color-accent)' : 'var(--color-border)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 150ms',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  )
}

// ── Shared send logic ─────────────────────────────────────────────────────────

function useChatSend({
  messages,
  activityData,
  onText,
  onTable,
  onDone,
}: {
  messages: TableChatMessage[]
  activityData: string
  onText: (text: string) => void
  onTable: (spec: AITableSpec) => void
  onDone: (content: string) => void
}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (text: string) => {
    if (isStreaming) return
    setIsStreaming(true)
    setStreamContent('')
    setToolStatus(null)

    const history = messages.slice(-16)
    let accText = ''

    try {
      const abort = new AbortController()
      abortRef.current = abort
      const res = await sendTableChatMessage(text, history, activityData, abort.signal)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No body')
      const dec = new TextDecoder()
      let buf = ''

      let streamErrorMsg: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            if (ev.type === 'text') { accText += ev.content; setStreamContent(accText); setToolStatus(null); onText(accText) }
            if (ev.type === 'tool_status') setToolStatus(ev.message)
            if (ev.type === 'table') onTable(ev.spec)
            if (ev.type === 'error') {
              const msg = String(ev.message ?? '')
              // Friendlier text for known cases
              if (msg.includes('credit balance is too low')) {
                streamErrorMsg = '⚠️ The Anthropic API key has no credits. Add credits at console.anthropic.com to use AI features.'
              } else {
                streamErrorMsg = `⚠️ ${msg.replace(/^Error:\s*\d+\s*/, '').slice(0, 400)}`
              }
            }
          } catch { /* skip */ }
        }
      }
      onDone(streamErrorMsg ?? accText)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      onDone('⚠️ Network error. Check that the dev server is running on port 3001.')
    } finally {
      setIsStreaming(false)
      setStreamContent('')
      setToolStatus(null)
      abortRef.current = null
    }
  }, [isStreaming, messages, activityData, onText, onTable, onDone])

  return { isStreaming, streamContent, toolStatus, send }
}

// ── AI Chat (full-screen, before first table) ─────────────────────────────────

const SUGGESTIONS = [
  'Show me my weekly mileage for the last 3 months',
  'Table of my 10 longest runs',
  'Compare my activity types by total time',
  'Show my fastest runs by pace',
]

function AITableView({
  activities,
  activityData,
  onTableCreated,
}: {
  activities: StravaActivity[]
  activityData: string
  onTableCreated: (spec: AITableSpec, msgs: TableChatMessage[]) => void
}) {
  const [messages, setMessages] = useState<TableChatMessage[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const { isStreaming, streamContent, toolStatus, send } = useChatSend({
    messages,
    activityData,
    onText: () => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight },
    onTable: (spec) => {
      const finalMsgs: TableChatMessage[] = [
        ...messages,
        { role: 'assistant', content: streamContent },
      ]
      onTableCreated(spec, finalMsgs)
    },
    onDone: (content) => {
      if (content) setMessages((p) => [...p, { role: 'assistant', content }])
    },
  })

  function handleSend(text: string) {
    setMessages((p) => [...p, { role: 'user', content: text }])
    send(text)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: 720, width: '100%', margin: '0 auto' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, minHeight: 260 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>✦</div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Create a table with AI</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 360, lineHeight: 1.6 }}>
                Describe what you want to see and AI will build a custom table from your training data.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 480 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => handleSend(s)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer', textAlign: 'left', lineHeight: 1.4, transition: 'border-color 150ms, background 150ms' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-light)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
            {isStreaming && <TypingIndicator content={streamContent} toolStatus={toolStatus} />}
          </>
        )}
      </div>
      <div style={{ padding: '0 24px' }}>
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
      <div style={{ height: 12 }} />
    </div>
  )
}

// ── AI Side Panel ─────────────────────────────────────────────────────────────

const PANEL_WIDTH = 380

function AISidePanel({
  open,
  onClose,
  initialMessages,
  activityData,
  onTableUpdated,
}: {
  open: boolean
  onClose: () => void
  initialMessages: TableChatMessage[]
  activityData: string
  onTableUpdated: (spec: AITableSpec, msgs: TableChatMessage[]) => void
}) {
  const [messages, setMessages] = useState<TableChatMessage[]>(initialMessages)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMessages(initialMessages) }, [initialMessages])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const { isStreaming, streamContent, toolStatus, send } = useChatSend({
    messages,
    activityData,
    onText: () => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight },
    onTable: (spec) => {
      const finalMsgs: TableChatMessage[] = [...messages, { role: 'assistant', content: streamContent }]
      onTableUpdated(spec, finalMsgs)
    },
    onDone: (content) => {
      if (content) setMessages((p) => [...p, { role: 'assistant', content }])
    },
  })

  function handleSend(text: string) {
    setMessages((p) => [...p, { role: 'user', content: text }])
    send(text)
  }

  return (
    <div style={{
      width: open ? PANEL_WIDTH : 0,
      minWidth: open ? PANEL_WIDTH : 0,
      overflow: 'hidden',
      borderLeft: open ? '1px solid var(--color-border)' : 'none',
      transition: 'width 260ms cubic-bezier(0.4, 0, 0.2, 1), min-width 260ms cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-surface)',
    }}>
      {/* Inner container at fixed width so content never squishes during animation */}
      <div style={{ width: PANEL_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1 }}>Edit with AI</span>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
          {isStreaming && <TypingIndicator content={streamContent} toolStatus={toolStatus} />}
        </div>

        <ChatInput onSend={handleSend} disabled={isStreaming} placeholder="Refine the table…" />
      </div>
    </div>
  )
}

// ── AI Table: Manual transform helpers ───────────────────────────────────────

interface AITransform {
  colOrder: number[]
  hiddenCols: number[]
  filters: Array<{ id: string; colIdx: number; op: FilterOp; value: string }>
  sort: { colIdx: number; dir: 'asc' | 'desc' } | null
}

function makeIdentityTransform(spec: AITableSpec): AITransform {
  return { colOrder: spec.headers.map((_, i) => i), hiddenCols: [], filters: [], sort: null }
}

function detectAIColType(rows: string[][], colIdx: number): 'string' | 'number' {
  if (rows.length === 0) return 'string'
  const sample = rows.slice(0, 12).map((r) => String(r[colIdx] ?? ''))
  let numericish = 0
  for (const v of sample) {
    if (/^-?\d+([,.]\d+)?\s*(mi|km|m|ft|%|W|kJ|cal|bpm|°)?$/i.test(v.trim())) numericish++
  }
  return numericish >= Math.ceil(sample.length * 0.6) ? 'number' : 'string'
}

function parseNum(s: string): number | null {
  const m = String(s).match(/-?\d+([,.]\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function applyAIFilter(cell: string, op: FilterOp, value: string, type: 'string' | 'number'): boolean {
  if (value === '' && !['eq', 'neq'].includes(op)) return true
  if (type === 'number') {
    const n = parseNum(cell ?? ''); const v = parseNum(value)
    if (n == null || v == null) return false
    if (op === 'eq')  return n === v
    if (op === 'neq') return n !== v
    if (op === 'gt')  return n > v
    if (op === 'lt')  return n < v
    if (op === 'gte') return n >= v
    if (op === 'lte') return n <= v
  }
  const s = (cell ?? '').toString().toLowerCase()
  const v = value.toLowerCase()
  if (op === 'contains') return s.includes(v)
  if (op === 'eq')  return s === v
  if (op === 'neq') return s !== v
  return true
}

function applyAITransform(spec: AITableSpec, t: AITransform, colTypes: ('string' | 'number')[]): { headers: string[]; rows: string[][] } {
  let rows: string[][] = spec.rows.map((r) => r.map((c) => String(c ?? '')))
  for (const f of t.filters) {
    const type = colTypes[f.colIdx] ?? 'string'
    rows = rows.filter((r) => applyAIFilter(r[f.colIdx] ?? '', f.op, f.value, type))
  }
  if (t.sort) {
    const { colIdx, dir } = t.sort
    const type = colTypes[colIdx] ?? 'string'
    rows.sort((a, b) => {
      const av = a[colIdx] ?? ''; const bv = b[colIdx] ?? ''
      if (type === 'number') {
        const an = parseNum(av); const bn = parseNum(bv)
        if (an == null && bn == null) return 0
        if (an == null) return 1
        if (bn == null) return -1
        return dir === 'asc' ? an - bn : bn - an
      }
      const c = String(av).localeCompare(String(bv))
      return dir === 'asc' ? c : -c
    })
  }
  const visible = t.colOrder.filter((i) => !t.hiddenCols.includes(i))
  const headers = visible.map((i) => spec.headers[i])
  rows = rows.map((row) => visible.map((i) => row[i] ?? ''))
  return { headers, rows }
}

// ── AI Table Display ──────────────────────────────────────────────────────────

function AIGeneratedTable({
  spec,
  panelOpen,
  onTogglePanel,
  transform,
  setTransform,
}: {
  spec: AITableSpec
  panelOpen: boolean
  onTogglePanel: () => void
  transform: AITransform
  setTransform: React.Dispatch<React.SetStateAction<AITransform>>
}) {
  const [openPopover, setOpenPopover] = useState<'cols' | 'filter' | 'sort' | null>(null)

  const colTypes = useMemo(
    () => spec.headers.map((_, idx) => detectAIColType(spec.rows, idx)),
    [spec]
  )
  const transformed = useMemo(() => applyAITransform(spec, transform, colTypes), [spec, transform, colTypes])

  function moveCol(idx: number, dir: -1 | 1) {
    setTransform((prev) => {
      const order = [...prev.colOrder]
      const pos = order.indexOf(idx)
      const target = pos + dir
      if (pos < 0 || target < 0 || target >= order.length) return prev
      ;[order[pos], order[target]] = [order[target], order[pos]]
      return { ...prev, colOrder: order }
    })
  }
  function toggleColVisible(idx: number) {
    setTransform((prev) => ({
      ...prev,
      hiddenCols: prev.hiddenCols.includes(idx) ? prev.hiddenCols.filter((i) => i !== idx) : [...prev.hiddenCols, idx],
    }))
  }
  function addFilter() {
    setTransform((prev) => ({ ...prev, filters: [...prev.filters, { id: Math.random().toString(36).slice(2, 9), colIdx: 0, op: colTypes[0] === 'number' ? 'gt' : 'contains', value: '' }] }))
  }
  function updateFilter(id: string, patch: Partial<{ colIdx: number; op: FilterOp; value: string }>) {
    setTransform((prev) => ({ ...prev, filters: prev.filters.map((f) => f.id === id ? { ...f, ...patch } : f) }))
  }
  function removeFilter(id: string) {
    setTransform((prev) => ({ ...prev, filters: prev.filters.filter((f) => f.id !== id) }))
  }
  function setSortCol(colIdx: number) { setTransform((p) => ({ ...p, sort: { colIdx, dir: p.sort?.dir ?? 'asc' } })) }
  function setSortDir(dir: 'asc' | 'desc') { setTransform((p) => p.sort ? ({ ...p, sort: { ...p.sort, dir } }) : p) }
  function clearSort() { setTransform((p) => ({ ...p, sort: null })) }

  const filterCount = transform.filters.length
  const visibleColCount = transform.colOrder.filter((i) => !transform.hiddenCols.includes(i)).length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      {/* Table header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Manual controls */}
        <div style={{ position: 'relative' }}>
          <PopoverButton
            label="Columns"
            count={visibleColCount}
            active={openPopover === 'cols'}
            onClick={() => setOpenPopover((p) => p === 'cols' ? null : 'cols')}
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>}
          />
          {openPopover === 'cols' && (
            <Popover onClose={() => setOpenPopover(null)}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 8 }}>Columns</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {transform.colOrder.map((idx, i) => {
                  const hidden = transform.hiddenCols.includes(idx)
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 6, background: 'var(--color-bg)', opacity: hidden ? 0.5 : 1 }}>
                      <button onClick={() => toggleColVisible(idx)} style={{ ...iconBtn(false), width: 18, height: 18 }} title={hidden ? 'Show' : 'Hide'}>
                        {hidden ? '○' : '●'}
                      </button>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }}>{spec.headers[idx]}</span>
                      <button onClick={() => moveCol(idx, -1)} disabled={i === 0} style={iconBtn(i === 0)}>↑</button>
                      <button onClick={() => moveCol(idx, 1)} disabled={i === transform.colOrder.length - 1} style={iconBtn(i === transform.colOrder.length - 1)}>↓</button>
                    </div>
                  )
                })}
              </div>
            </Popover>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <PopoverButton
            label="Filter"
            count={filterCount}
            active={openPopover === 'filter'}
            onClick={() => setOpenPopover((p) => p === 'filter' ? null : 'filter')}
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>}
          />
          {openPopover === 'filter' && (
            <Popover onClose={() => setOpenPopover(null)}>
              {transform.filters.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '6px 4px 10px' }}>No filters applied.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {transform.filters.map((f) => {
                    const type = colTypes[f.colIdx] ?? 'string'
                    return (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <select value={f.colIdx} onChange={(e) => {
                          const newIdx = Number(e.target.value)
                          const newType = colTypes[newIdx] ?? 'string'
                          const validOps = OPS_BY_TYPE[newType].map((o) => o.op)
                          const newOp = validOps.includes(f.op) ? f.op : validOps[0]
                          updateFilter(f.id, { colIdx: newIdx, op: newOp })
                        }} style={selectStyle}>
                          {spec.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                        </select>
                        <select value={f.op} onChange={(e) => updateFilter(f.id, { op: e.target.value as FilterOp })} style={{ ...selectStyle, width: 70 }}>
                          {OPS_BY_TYPE[type].map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
                        </select>
                        <input
                          type={type === 'number' ? 'number' : 'text'}
                          value={f.value}
                          onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                          style={{ flex: 1, minWidth: 60, padding: '4px 7px', fontSize: 12, borderRadius: 5, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', outline: 'none' }}
                        />
                        <button onClick={() => removeFilter(f.id)} style={iconBtn(false)}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
              <button onClick={addFilter} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--color-accent-light)', color: 'var(--color-accent)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                <span style={{ fontWeight: 700 }}>+</span> Add filter
              </button>
            </Popover>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <PopoverButton
            label="Sort"
            count={transform.sort ? 1 : 0}
            active={openPopover === 'sort'}
            onClick={() => setOpenPopover((p) => p === 'sort' ? null : 'sort')}
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h13M3 12h9M3 18h5M17 8l4 4-4 4" /></svg>}
          />
          {openPopover === 'sort' && (
            <Popover onClose={() => setOpenPopover(null)}>
              {transform.sort ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <select value={transform.sort.colIdx} onChange={(e) => setSortCol(Number(e.target.value))} style={{ ...selectStyle, flex: 1 }}>
                    {spec.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                  <select value={transform.sort.dir} onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')} style={{ ...selectStyle, width: 90 }}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                  <button onClick={clearSort} style={iconBtn(false)}>✕</button>
                </div>
              ) : (
                <button onClick={() => setSortCol(0)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--color-accent-light)', color: 'var(--color-accent)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  <span style={{ fontWeight: 700 }}>+</span> Add sort
                </button>
              )}
            </Popover>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: 'var(--color-border)', margin: '0 4px' }} />

        {/* Title */}
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{spec.title}</span>
        {spec.description && <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{spec.description}</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginRight: 8 }}>
          {transformed.rows.length}{transformed.rows.length !== spec.rows.length ? ` of ${spec.rows.length}` : ''} rows
        </span>
        <button
          onClick={onTogglePanel}
          title={panelOpen ? 'Close AI panel' : 'Edit with AI'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: panelOpen ? 'var(--color-accent)' : 'var(--color-surface)',
            color: panelOpen ? 'white' : 'var(--color-text-secondary)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {panelOpen ? 'Close' : 'Edit with AI'}
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <DataTable headers={transformed.headers} rows={transformed.rows} />
      </div>
    </div>
  )
}

// ── View: Custom Table (Notion-style builder) ─────────────────────────────────

type ColType = 'string' | 'number' | 'date'
type FilterOp = 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'before' | 'after' | 'on'

interface CustomColumnMeta {
  key: string
  label: string
  type: ColType
  getRaw: (a: StravaActivity, unit: 'mi' | 'km') => string | number | null
  format: (a: StravaActivity, unit: 'mi' | 'km') => string
}

const CUSTOM_COLS: CustomColumnMeta[] = [
  { key: 'date',      label: 'Date',         type: 'date',
    getRaw: (a) => a.start_date_local.slice(0, 10),
    format: (a) => format(parseISO(a.start_date_local), 'MMM d, yyyy') },
  { key: 'name',      label: 'Name',         type: 'string',
    getRaw: (a) => a.name, format: (a) => a.name },
  { key: 'type',      label: 'Type',         type: 'string',
    getRaw: (a) => a.sport_type || a.type,
    format: (a) => a.sport_type || a.type },
  { key: 'distance',  label: 'Distance',     type: 'number',
    getRaw: (a, u) => +(u === 'mi' ? metersToMiles(a.distance) : metersToKm(a.distance)).toFixed(2),
    format: (a, u) => formatDistance(a.distance, u) },
  { key: 'moving_min', label: 'Moving (min)', type: 'number',
    getRaw: (a) => Math.round(a.moving_time / 60),
    format: (a) => formatDuration(a.moving_time) },
  { key: 'pace_sec',  label: 'Pace (sec/unit)', type: 'number',
    getRaw: (a, u) => {
      if (!a.average_speed) return null
      const metersPerUnit = u === 'mi' ? 1609.344 : 1000
      return Math.round(metersPerUnit / a.average_speed)
    },
    format: (a, u) => formatPace(a.average_speed, u) },
  { key: 'elev',      label: 'Elevation (m)', type: 'number',
    getRaw: (a) => Math.round(a.total_elevation_gain),
    format: (a, u) => formatElevation(a.total_elevation_gain, u) },
  { key: 'avg_hr',    label: 'Avg HR',       type: 'number',
    getRaw: (a) => a.average_heartrate ?? null,
    format: (a) => formatHeartRate(a.average_heartrate) },
  { key: 'max_hr',    label: 'Max HR',       type: 'number',
    getRaw: (a) => a.max_heartrate ?? null,
    format: (a) => formatHeartRate(a.max_heartrate) },
  { key: 'avg_watts', label: 'Avg Watts',    type: 'number',
    getRaw: (a) => a.average_watts ?? null,
    format: (a) => a.average_watts != null ? `${Math.round(a.average_watts)} W` : '—' },
  { key: 'calories',  label: 'Calories',     type: 'number',
    getRaw: (a) => a.calories ?? null,
    format: (a) => formatCalories(a.calories) },
]

const COL_BY_KEY = Object.fromEntries(CUSTOM_COLS.map((c) => [c.key, c]))

const OPS_BY_TYPE: Record<ColType, { op: FilterOp; label: string }[]> = {
  string: [
    { op: 'contains', label: 'contains' },
    { op: 'eq',       label: 'equals' },
    { op: 'neq',      label: 'not equals' },
  ],
  number: [
    { op: 'eq',  label: '=' },
    { op: 'neq', label: '≠' },
    { op: 'gt',  label: '>' },
    { op: 'lt',  label: '<' },
    { op: 'gte', label: '≥' },
    { op: 'lte', label: '≤' },
  ],
  date: [
    { op: 'on',     label: 'on' },
    { op: 'before', label: 'before' },
    { op: 'after',  label: 'after' },
  ],
}

interface CustomFilter {
  id: string
  columnKey: string
  op: FilterOp
  value: string
}

interface CustomSort {
  columnKey: string
  dir: 'asc' | 'desc'
}

function applyFilter(raw: string | number | null, op: FilterOp, value: string, type: ColType): boolean {
  if (raw == null) return false
  if (value === '' && !['eq', 'neq'].includes(op)) return true
  if (type === 'string') {
    const s = String(raw).toLowerCase()
    const v = value.toLowerCase()
    if (op === 'contains') return s.includes(v)
    if (op === 'eq')       return s === v
    if (op === 'neq')      return s !== v
  }
  if (type === 'number') {
    const n = Number(raw); const v = Number(value)
    if (Number.isNaN(v)) return true
    if (op === 'eq')  return n === v
    if (op === 'neq') return n !== v
    if (op === 'gt')  return n > v
    if (op === 'lt')  return n < v
    if (op === 'gte') return n >= v
    if (op === 'lte') return n <= v
  }
  if (type === 'date') {
    const r = String(raw)
    if (op === 'on')     return r === value
    if (op === 'before') return r < value
    if (op === 'after')  return r > value
  }
  return true
}

function PopoverButton({ label, count, active, onClick, icon }: {
  label: string; count?: number; active: boolean; onClick: () => void; icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 11px', borderRadius: 7,
        border: '1px solid var(--color-border)',
        background: active ? 'var(--color-accent-light)' : 'var(--color-surface)',
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      {icon}
      {label}
      {count != null && count > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 600,
          padding: '1px 6px', borderRadius: 8,
          background: active ? 'var(--color-accent)' : 'var(--color-border)',
          color: active ? 'white' : 'var(--color-text-secondary)',
          minWidth: 16, textAlign: 'center',
        }}>{count}</span>
      )}
    </button>
  )
}

function Popover({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
        zIndex: 50, minWidth: 280, maxWidth: 360,
        padding: 12,
      }}>
        {children}
      </div>
    </>
  )
}

function CustomTable({ activities, unit }: { activities: StravaActivity[]; unit: 'mi' | 'km' }) {
  const [orderedKeys, setOrderedKeys] = useState<string[]>(['date', 'name', 'type', 'distance', 'moving_min', 'pace_sec'])
  const [filters, setFilters] = useState<CustomFilter[]>([])
  const [sort, setSort] = useState<CustomSort | null>({ columnKey: 'date', dir: 'desc' })
  const [openPopover, setOpenPopover] = useState<'cols' | 'filter' | 'sort' | null>(null)

  const visibleCols = useMemo(() => orderedKeys.map((k) => COL_BY_KEY[k]).filter(Boolean), [orderedKeys])
  const availableCols = useMemo(() => CUSTOM_COLS.filter((c) => !orderedKeys.includes(c.key)), [orderedKeys])

  const rows = useMemo(() => {
    let rs = activities.slice()
    // Apply filters
    for (const f of filters) {
      const meta = COL_BY_KEY[f.columnKey]
      if (!meta) continue
      rs = rs.filter((a) => applyFilter(meta.getRaw(a, unit), f.op, f.value, meta.type))
    }
    // Apply sort
    if (sort) {
      const meta = COL_BY_KEY[sort.columnKey]
      if (meta) {
        rs.sort((a, b) => {
          const av = meta.getRaw(a, unit); const bv = meta.getRaw(b, unit)
          if (av == null && bv == null) return 0
          if (av == null) return 1
          if (bv == null) return -1
          if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av
          const s = String(av).localeCompare(String(bv))
          return sort.dir === 'asc' ? s : -s
        })
      }
    }
    return rs
  }, [activities, filters, sort, unit])

  function moveCol(key: string, dir: -1 | 1) {
    setOrderedKeys((prev) => {
      const idx = prev.indexOf(key)
      if (idx < 0) return prev
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  function addCol(key: string) { setOrderedKeys((p) => [...p, key]) }
  function removeCol(key: string) { setOrderedKeys((p) => p.filter((k) => k !== key)) }

  function addFilter() {
    setFilters((p) => [...p, { id: Math.random().toString(36).slice(2, 9), columnKey: 'distance', op: 'gt', value: '' }])
  }
  function updateFilter(id: string, patch: Partial<CustomFilter>) {
    setFilters((p) => p.map((f) => f.id === id ? { ...f, ...patch } : f))
  }
  function removeFilter(id: string) { setFilters((p) => p.filter((f) => f.id !== id)) }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: 'var(--color-surface)' }}>
        <div style={{ position: 'relative' }}>
          <PopoverButton
            label="Columns"
            count={orderedKeys.length}
            active={openPopover === 'cols'}
            onClick={() => setOpenPopover((p) => p === 'cols' ? null : 'cols')}
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>}
          />
          {openPopover === 'cols' && (
            <Popover onClose={() => setOpenPopover(null)}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 8 }}>Shown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                {visibleCols.map((c, i) => (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 6, background: 'var(--color-bg)' }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }}>{c.label}</span>
                    <button onClick={() => moveCol(c.key, -1)} disabled={i === 0} style={iconBtn(i === 0)}>↑</button>
                    <button onClick={() => moveCol(c.key, 1)} disabled={i === visibleCols.length - 1} style={iconBtn(i === visibleCols.length - 1)}>↓</button>
                    <button onClick={() => removeCol(c.key)} style={iconBtn(false)} title="Remove">✕</button>
                  </div>
                ))}
                {visibleCols.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: 4 }}>No columns yet — add some below.</div>}
              </div>
              {availableCols.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 8 }}>Add</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {availableCols.map((c) => (
                      <button key={c.key} onClick={() => addCol(c.key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--color-text-primary)' }}>
                        <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>+</span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Popover>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <PopoverButton
            label="Filter"
            count={filters.length}
            active={openPopover === 'filter'}
            onClick={() => setOpenPopover((p) => p === 'filter' ? null : 'filter')}
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>}
          />
          {openPopover === 'filter' && (
            <Popover onClose={() => setOpenPopover(null)}>
              {filters.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '6px 4px 10px' }}>No filters applied.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {filters.map((f) => {
                    const meta = COL_BY_KEY[f.columnKey]
                    return (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <select value={f.columnKey} onChange={(e) => {
                          const newCol = COL_BY_KEY[e.target.value]
                          // Reset op if not valid for new type
                          const validOps = OPS_BY_TYPE[newCol.type].map((o) => o.op)
                          const newOp = validOps.includes(f.op) ? f.op : validOps[0]
                          updateFilter(f.id, { columnKey: e.target.value, op: newOp })
                        }} style={selectStyle}>
                          {CUSTOM_COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                        <select value={f.op} onChange={(e) => updateFilter(f.id, { op: e.target.value as FilterOp })} style={{ ...selectStyle, width: 70 }}>
                          {OPS_BY_TYPE[meta.type].map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
                        </select>
                        <input
                          type={meta.type === 'date' ? 'date' : meta.type === 'number' ? 'number' : 'text'}
                          value={f.value}
                          onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                          style={{ flex: 1, minWidth: 60, padding: '4px 7px', fontSize: 12, borderRadius: 5, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', outline: 'none' }}
                        />
                        <button onClick={() => removeFilter(f.id)} style={iconBtn(false)}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
              <button onClick={addFilter} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--color-accent-light)', color: 'var(--color-accent)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                <span style={{ fontWeight: 700 }}>+</span> Add filter
              </button>
            </Popover>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <PopoverButton
            label="Sort"
            count={sort ? 1 : 0}
            active={openPopover === 'sort'}
            onClick={() => setOpenPopover((p) => p === 'sort' ? null : 'sort')}
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h13M3 12h9M3 18h5M17 8l4 4-4 4" /></svg>}
          />
          {openPopover === 'sort' && (
            <Popover onClose={() => setOpenPopover(null)}>
              {sort ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  <select value={sort.columnKey} onChange={(e) => setSort({ ...sort, columnKey: e.target.value })} style={{ ...selectStyle, flex: 1 }}>
                    {CUSTOM_COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <select value={sort.dir} onChange={(e) => setSort({ ...sort, dir: e.target.value as 'asc' | 'desc' })} style={{ ...selectStyle, width: 90 }}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                  <button onClick={() => setSort(null)} style={iconBtn(false)}>✕</button>
                </div>
              ) : (
                <button onClick={() => setSort({ columnKey: 'date', dir: 'desc' })} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--color-accent-light)', color: 'var(--color-accent)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  <span style={{ fontWeight: 700 }}>+</span> Add sort
                </button>
              )}
            </Popover>
          )}
        </div>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {rows.length} of {activities.length}
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {visibleCols.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            Add columns to start building your table.
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            No rows match your filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {visibleCols.map((c) => (
                  <th key={c.key} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                  {visibleCols.map((c) => (
                    <td key={c.key} style={{
                      padding: '9px 16px',
                      color: c.key === 'name' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      fontWeight: c.key === 'name' ? 500 : 400,
                      whiteSpace: c.key === 'name' ? 'normal' : 'nowrap',
                    }}>
                      {c.format(a, unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const iconBtn = (disabled: boolean): React.CSSProperties => ({
  width: 22, height: 22, borderRadius: 5, border: 'none',
  background: 'transparent', color: disabled ? 'var(--color-border)' : 'var(--color-text-tertiary)',
  cursor: disabled ? 'default' : 'pointer', fontSize: 12, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
})

const selectStyle: React.CSSProperties = {
  padding: '4px 7px', fontSize: 12, borderRadius: 5,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)', color: 'var(--color-text-primary)',
  outline: 'none', cursor: 'pointer', maxWidth: 110,
}

// ── View selector ─────────────────────────────────────────────────────────────

type ViewId = 'weekly' | 'mix' | 'all' | 'custom' | 'ai'

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'weekly', label: 'Distance / Week' },
  { id: 'mix',    label: 'Activity Mix' },
  { id: 'all',    label: 'All Activities' },
  { id: 'custom', label: 'Custom Table' },
  { id: 'ai',     label: 'Create with AI' },
]

// ── Root ──────────────────────────────────────────────────────────────────────

// Pulse animation for typing dots
const pulseStyle = `
  @keyframes pulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }
`

export default function TableBuilderPage() {
  const activitiesByDate = useAppStore((s) => s.activitiesByDate)
  const distanceUnit = useAppStore((s) => s.distanceUnit)
  const [activeView, setActiveView] = useState<ViewId>('weekly')
  const [aiTable, setAiTable] = useState<AITableSpec | null>(null)
  const [aiMessages, setAiMessages] = useState<TableChatMessage[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [aiTransform, setAiTransform] = useState<AITransform>({ colOrder: [], hiddenCols: [], filters: [], sort: null })

  const activities = useMemo(() =>
    Object.values(activitiesByDate).flat()
      .sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime()),
    [activitiesByDate]
  )

  const activityData = useMemo(() => {
    const sample = activities.slice(0, 300).map((a) => ({
      date: a.start_date_local.slice(0, 10),
      type: a.sport_type || a.type,
      name: a.name,
      distanceMi: +(metersToMiles(a.distance)).toFixed(2),
      movingSecs: a.moving_time,
      avgSpeedMs: a.average_speed,
      elevationM: a.total_elevation_gain,
      avgHR: a.average_heartrate ?? null,
    }))
    return JSON.stringify(sample)
  }, [activities])

  function handleTableCreated(spec: AITableSpec, msgs: TableChatMessage[]) {
    setAiTable(spec)
    setAiMessages(msgs)
    setPanelOpen(false)
    setAiTransform(makeIdentityTransform(spec))
  }

  function handleTableUpdated(spec: AITableSpec, msgs: TableChatMessage[]) {
    setAiTable(spec)
    setAiMessages(msgs)
    // Reset manual transforms when AI changes the table — column indices may not match
    setAiTransform(makeIdentityTransform(spec))
  }

  const showAIChat  = activeView === 'ai' && !aiTable
  const showAITable = activeView === 'ai' && !!aiTable

  return (
    <>
      <style>{pulseStyle}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 3, gap: 2 }}>
            {VIEWS.map(({ id, label }) => {
              const active = activeView === id
              const isAI = id === 'ai'
              return (
                <button
                  key={id}
                  onClick={() => setActiveView(id)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    color: active ? (isAI ? 'white' : 'var(--color-accent)') : 'var(--color-text-secondary)',
                    background: active ? (isAI ? 'var(--color-accent)' : 'var(--color-surface)') : 'transparent',
                    boxShadow: active && !isAI ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 150ms', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {isAI && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                  )}
                  {label}
                </button>
              )
            })}
          </div>
          {activeView === 'ai' && aiTable && (
            <button
              onClick={() => { setAiTable(null); setAiMessages([]); setPanelOpen(false); setAiTransform({ colOrder: [], hiddenCols: [], filters: [], sort: null }) }}
              style={{ marginLeft: 4, padding: '5px 11px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 12, cursor: 'pointer' }}
            >
              New table
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeView === 'weekly' && <div style={{ flex: 1, overflow: 'auto' }}><DistancePerWeek activities={activities} unit={distanceUnit} /></div>}
          {activeView === 'mix'    && <div style={{ flex: 1, overflow: 'auto' }}><ActivityMix activities={activities} unit={distanceUnit} /></div>}
          {activeView === 'all'    && <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}><AllActivities activities={activities} unit={distanceUnit} /></div>}
          {activeView === 'custom' && <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}><CustomTable activities={activities} unit={distanceUnit} /></div>}
          {showAIChat  && <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}><AITableView activities={activities} activityData={activityData} onTableCreated={handleTableCreated} /></div>}

          {/* AI table + side panel — true side-by-side layout */}
          {showAITable && (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              <AIGeneratedTable
                spec={aiTable}
                panelOpen={panelOpen}
                onTogglePanel={() => setPanelOpen((v) => !v)}
                transform={aiTransform}
                setTransform={setAiTransform}
              />
              <AISidePanel
                open={panelOpen}
                onClose={() => setPanelOpen(false)}
                initialMessages={aiMessages}
                activityData={activityData}
                onTableUpdated={handleTableUpdated}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
