import { useState, useEffect } from 'react'
import type { OutputRenderPayload } from '../../../shared/models/Presentation'
import { SlideRenderer } from '../../shared/SlideRenderer'

export function OutputPreview() {
  const [payload, setPayload] = useState<OutputRenderPayload | null>(null)

  useEffect(() => {
    return window.electronAPI.onOutputRender!((p) => setPayload(p))
  }, [])

  return (
    <div
      className="h-full aspect-video bg-black rounded overflow-hidden border border-[#333]"
    >
      {payload ? (
        <SlideRenderer payload={payload} />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-app-600 text-xs"
        >
          No output
        </div>
      )}
    </div>
  )
}
