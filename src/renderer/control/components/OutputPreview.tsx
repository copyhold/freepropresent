import { useState, useEffect, useRef } from 'react'
import type { OutputRenderPayload } from '../../../shared/models/Presentation'
import { SlideRenderer } from '../../shared/SlideRenderer'

const REF_W = 1920
const REF_H = 1080

export function OutputPreview() {
  const [payload, setPayload] = useState<OutputRenderPayload | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    return window.electronAPI.onOutputRender!((p) => setPayload(p))
  }, [])

  useEffect(() => {
    if (!wrapRef.current) return
    const el = wrapRef.current
    const obs = new ResizeObserver(() => {
      setScale(el.clientWidth / REF_W)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={wrapRef}
      className="h-full aspect-video bg-black rounded overflow-hidden border border-[#333] relative"
    >
      {payload ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: REF_W,
            height: REF_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <SlideRenderer payload={payload} />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-app-600 text-xs">
          No output
        </div>
      )}
    </div>
  )
}
