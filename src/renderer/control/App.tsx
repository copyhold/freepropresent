import { useEffect } from 'react'
import { useAppStore } from './store'
import { SongList } from './components/SongList'
import { SlideNavigator } from './components/SlideNavigator'
import { TemplateSelector } from './components/TemplateSelector'
import { OutputPreview } from './components/OutputPreview'
import type { PresentationState, LibraryChangedEvent } from '@shared/models/Presentation'

export function App() {
  const loadLibrary = useAppStore((s) => s.loadLibrary)
  const setPresentationState = useAppStore((s) => s.setPresentationState)
  const nextSlide = useAppStore((s) => s.nextSlide)
  const prevSlide = useAppStore((s) => s.prevSlide)
  const setMode = useAppStore((s) => s.setMode)
  const gotoSection = useAppStore((s) => s.gotoSection)
  const presentationState = useAppStore((s) => s.presentationState)

  useEffect(() => {
    loadLibrary()

    const unsubState = window.electronAPI.onPresentationStateChanged!((state: PresentationState) => {
      setPresentationState(state)
    })

    const unsubLibrary = window.electronAPI.onLibraryChanged!((_event: LibraryChangedEvent) => {
      loadLibrary()
    })

    return () => {
      unsubState()
      unsubLibrary()
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          nextSlide()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prevSlide()
          break
        case 'Escape':
          setMode('blank')
          break
        default:
          gotoSection(e.key)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nextSlide, prevSlide, setMode, gotoSection])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        gridTemplateRows: '1fr',
        height: '100vh',
        background: '#111',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      {/* Left: song list */}
      <div style={{ borderRight: '1px solid #2a2a2a', overflow: 'hidden' }}>
        <SongList />
      </div>

      {/* Right: main area */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Template selector */}
        <div style={{ borderBottom: '1px solid #2a2a2a' }}>
          <TemplateSelector />
        </div>

        {/* Slide navigator */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SlideNavigator />
        </div>

        {/* Bottom: preview + controls */}
        <div
          style={{
            borderTop: '1px solid #2a2a2a',
            padding: '8px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}
        >
          <div style={{ width: '240px', flexShrink: 0 }}>
            <OutputPreview />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>
              Slide {(presentationState?.currentSlideIndex ?? 0) + 1} / {presentationState?.totalSlides ?? 0}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setMode('live')}
                style={modeBtn(presentationState?.outputMode === 'live')}
              >
                Live
              </button>
              <button
                onClick={() => setMode('blank')}
                style={modeBtn(presentationState?.outputMode === 'blank')}
              >
                Blank
              </button>
            </div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
              ← → Space to navigate · 1/2/c/b for sections · Esc to blank
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function modeBtn(active: boolean): React.CSSProperties {
  return {
    padding: '4px 12px',
    borderRadius: '4px',
    border: active ? '2px solid #4a8fff' : '1px solid #444',
    background: active ? '#1a2a4a' : '#222',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px'
  }
}
