import { useState, useEffect } from 'react'
import type { OutputRenderPayload } from '@shared/models/Presentation'
import { SlideRenderer } from '../../shared/SlideRenderer'

export function OutputPreview() {
  const [payload, setPayload] = useState<OutputRenderPayload | null>(null)

  useEffect(() => {
    return window.electronAPI.onOutputRender!((p) => setPayload(p))
  }, [])

  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16/9',
        background: '#000',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #333'
      }}
    >
      {payload ? (
        <SlideRenderer payload={payload} />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#444',
            fontSize: '12px'
          }}
        >
          No output
        </div>
      )}
    </div>
  )
}
