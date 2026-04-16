import { useRef, useState, useCallback, useEffect } from 'react'

export interface DragGhostInfo {
  label: string
  emoji: string
  colorHex: string
}

export interface MobileDragState {
  activityId: string
  fromDate: string
  ghost: DragGhostInfo
  x: number
  y: number
  overDate: string | null
}

function getDateKeyAtPoint(x: number, y: number): string | null {
  const els = document.elementsFromPoint(x, y)
  for (const el of els) {
    const dateKey = (el as HTMLElement).dataset?.dateKey
    if (dateKey) return dateKey
  }
  return null
}

export function useMobilePlanDrag(
  onDrop: (fromDate: string, toDate: string, activityId: string) => void
) {
  const [dragState, setDragState] = useState<MobileDragState | null>(null)
  const isDragging = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ activityId: string; fromDate: string; ghost: DragGhostInfo } | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const onDropRef = useRef(onDrop)
  useEffect(() => { onDropRef.current = onDrop }, [onDrop])

  const cleanup = useCallback((commit: boolean, overDate: string | null) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (commit && isDragging.current && pending.current && overDate && overDate !== pending.current.fromDate) {
      onDropRef.current(pending.current.fromDate, overDate, pending.current.activityId)
    }
    isDragging.current = false
    pending.current = null
    startPos.current = null
    setDragState(null)
  }, [])

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!isDragging.current) return
      e.preventDefault()
      const overDate = getDateKeyAtPoint(e.clientX, e.clientY)
      setDragState(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, overDate } : null)
    }

    function onPointerUp(e: PointerEvent) {
      if (!isDragging.current) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }
        pending.current = null
        startPos.current = null
        return
      }
      const overDate = getDateKeyAtPoint(e.clientX, e.clientY)
      cleanup(true, overDate)
    }

    function onPointerCancel() {
      cleanup(false, null)
    }

    document.addEventListener('pointermove', onPointerMove, { passive: false })
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerCancel)

    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [cleanup])

  const startLongPress = useCallback((
    e: React.PointerEvent,
    activityId: string,
    fromDate: string,
    ghost: DragGhostInfo
  ) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pending.current = { activityId, fromDate, ghost }
    startPos.current = { x: e.clientX, y: e.clientY }

    longPressTimer.current = setTimeout(() => {
      if (!pending.current || !startPos.current) return
      isDragging.current = true
      navigator.vibrate?.(40)
      setDragState({
        activityId: pending.current.activityId,
        fromDate: pending.current.fromDate,
        ghost: pending.current.ghost,
        x: startPos.current.x,
        y: startPos.current.y,
        overDate: pending.current.fromDate,
      })
    }, 500)
  }, [])

  const cancelIfMoved = useCallback((e: React.PointerEvent) => {
    if (isDragging.current || !startPos.current) return
    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 8) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      pending.current = null
      startPos.current = null
    }
  }, [])

  return { dragState, startLongPress, cancelIfMoved }
}
