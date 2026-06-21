import { useState, useEffect } from 'react'
import type { OutputRenderPayload } from '../../shared/models/Presentation'
import { SlideRenderer } from '../shared/SlideRenderer'
import { injectCss } from '../shared/injectCss'

export function App() {
  const [payload, setPayload] = useState<OutputRenderPayload | null>(null)

  useEffect(() => {
    return window.electronAPI.onRender!((p) => setPayload(p))
  }, [])

  useEffect(() => {
    window.electronAPI.getConfig!().then((config) => {
      injectCss('presentation-custom-css', config.presentationCss ?? '')
    })

    return window.electronAPI.onConfigChanged!((config) => {
      injectCss('presentation-custom-css', config.presentationCss ?? '')
    })
  }, [])

  if (!payload) {
    return <div className="w-full h-full bg-black" />
  }

  return (
    <div className="w-screen h-screen">
      <SlideRenderer payload={payload} />
    </div>
  )
}
