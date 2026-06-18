import { useState, useEffect } from 'react'
import type { OutputRenderPayload } from '@shared/models/Presentation'
import { SlideRenderer } from '../shared/SlideRenderer'

export function App() {
  const [payload, setPayload] = useState<OutputRenderPayload | null>(null)

  useEffect(() => {
    return window.electronAPI.onRender!((p) => setPayload(p))
  }, [])

  if (!payload) {
    return <div style={{ width: '100%', height: '100%', background: '#000' }} />
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <SlideRenderer payload={payload} />
    </div>
  )
}
