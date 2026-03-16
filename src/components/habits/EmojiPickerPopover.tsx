import { useState, useRef, useEffect } from 'react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

interface Props {
  emoji: string
  onChange: (emoji: string) => void
  size?: number
  pickerSide?: 'bottom' | 'top'
}

export default function EmojiPickerPopover({ emoji, onChange, size = 40, pickerSide = 'bottom' }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const pickerStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    zIndex: 1000,
    ...(pickerSide === 'top'
      ? { bottom: size + 4 }
      : { top: size + 4 }),
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Change emoji"
        style={{
          width: size,
          height: size,
          borderRadius: 'var(--radius-md)',
          background: open ? 'var(--color-border)' : 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.round(size * 0.55),
          cursor: 'pointer',
          transition: 'background 0.12s',
        }}
      >
        {emoji}
      </button>
      {open && (
        <div style={pickerStyle}>
          <Picker
            data={data}
            onEmojiSelect={(e: { native: string }) => {
              onChange(e.native)
              setOpen(false)
            }}
            theme="auto"
            previewPosition="none"
            skinTonePosition="none"
          />
        </div>
      )}
    </div>
  )
}
