import { parseISO, format } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useCalendarRange } from '../../hooks/useCalendarRange'
import { getDateRange } from '../../utils/dateUtils'

/**
 * Self-contained mobile period navigation pill for the training log.
 * Mirrors the bordered-pill style used in HabitWeekView / WeekReviewPage.
 * Reads all needed state from the store so callers just render <MobilePeriodNav />.
 */
export default function MobilePeriodNav() {
  const navigate = useAppStore((s) => s.navigate)
  const goToToday = useAppStore((s) => s.goToToday)
  const isLoading = useAppStore((s) => s.isLoading)
  const appMode = useAppStore((s) => s.appMode)
  const anchorDate = useAppStore((s) => s.anchorDate)
  const currentView = useAppStore((s) => s.currentView)
  const { label } = useCalendarRange()

  const isGridMode = appMode === 'grid'
  const anchor = parseISO(anchorDate)
  const gridLabel = `Q${Math.ceil((anchor.getMonth() + 1) / 3)} ${format(anchor, 'yyyy')}`
  const navLabel = isGridMode ? gridLabel : label

  const today = new Date()
  const isViewingToday = isGridMode
    ? anchor.getFullYear() === today.getFullYear()
    : (() => { const { start, end } = getDateRange(currentView, anchor); return today >= start && today <= end })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden',
      }}>
        <button onClick={() => navigate('prev')} aria-label="Previous period" style={{
          width: 44, height: 40, flexShrink: 0, background: 'transparent', border: 'none',
          borderRight: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)', fontSize: 22, lineHeight: 1,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300,
        }}>‹</button>
        <span style={{
          flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700,
          color: 'var(--color-text-primary)', letterSpacing: '-0.3px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          {isLoading && <Spinner />}
          {navLabel}
        </span>
        <button onClick={() => navigate('next')} aria-label="Next period" style={{
          width: 44, height: 40, flexShrink: 0, background: 'transparent', border: 'none',
          borderLeft: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)', fontSize: 22, lineHeight: 1,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300,
        }}>›</button>
      </div>
      {!isViewingToday && (
        <button onClick={goToToday} style={{
          padding: '5px 12px', borderRadius: 7, fontSize: 'var(--font-size-sm)',
          fontWeight: 600, color: 'var(--color-text-secondary)', background: 'transparent',
          border: '1px solid var(--color-border)', cursor: 'pointer', alignSelf: 'flex-start',
        }}>Today</button>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      width: 8, height: 8,
      border: '1.5px solid var(--color-border)',
      borderTopColor: 'var(--color-accent)',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}
