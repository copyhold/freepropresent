import { useAppStore } from '../store'

export function SlideNavigator() {
  const activeSong = useAppStore((s) => s.activeSong)
  const presentationState = useAppStore((s) => s.presentationState)
  const gotoSlide = useAppStore((s) => s.gotoSlide)

  if (!activeSong) {
    return (
      <div className="p-4 text-app-400 text-center">
        Select a song to start
      </div>
    )
  }

  let flatIndex = 0

  return (
    <div className="overflow-y-auto h-full p-2">
      {activeSong.sections.map((section) => {
        const sectionStart = flatIndex
        flatIndex += section.slides.length

        return (
          <div key={section.name} className="mb-3">
            <div
              className="text-[11px] uppercase text-app-300 mb-1 tracking-[0.05em]"
            >
              {section.name}
            </div>
            <div className="flex flex-wrap gap-1">
              {section.slides.map((slide, idx) => {
                const fi = sectionStart + idx
                const isActive = presentationState?.currentSlideIndex === fi
                const primaryLines = slide.lines['primary'] ?? []

                return (
                  <div
                    key={slide.id}
                    onClick={() => gotoSlide(fi)}
                    title={primaryLines.join('\n')}
                    className={`w-20 h-12 p-1 rounded cursor-pointer overflow-hidden text-[9px] leading-[1.3] text-app-100 ${isActive ? 'border-2 border-accent bg-accent-dark' : 'border border-[#333] bg-app-900'}`}
                  >
                    {primaryLines.slice(0, 3).join('\n')}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
