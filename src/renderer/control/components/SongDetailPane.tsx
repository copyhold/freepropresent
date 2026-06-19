import { useAppStore } from '../store'

export function SongDetailPane() {
  const selectedSong = useAppStore((s) => s.selectedSong)
  const activeSong = useAppStore((s) => s.activeSong)
  const loadSong = useAppStore((s) => s.loadSong)

  if (!selectedSong) {
    return (
      <div className="flex items-center justify-center h-full text-app-500 text-sm">
        Select a song to view details
      </div>
    )
  }

  const isPresenting = activeSong?.id === selectedSong.id
  const primaryLang = selectedSong.languages[0] ?? 'primary'
  const variants = selectedSong.languages.slice(1).map((lang, i) => ({
    lang,
    filePath: selectedSong.variantFilePaths[i]
  }))

  const openFile = (filePath: string) => {
    window.electronAPI.openFile?.(filePath)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header: Start Presenting button */}
      <div className="p-3 border-b border-app-700 shrink-0">
        <button
          onClick={() => loadSong(selectedSong.id)}
          disabled={isPresenting}
          className={`w-full py-2 px-4 rounded text-sm font-medium cursor-pointer transition-colors ${
            isPresenting
              ? 'bg-accent-dark border border-accent text-app-300 cursor-default'
              : 'bg-accent text-white hover:bg-accent/80'
          }`}
        >
          {isPresenting ? 'Presenting' : 'Start Presenting'}
        </button>
      </div>

      {/* Metadata */}
      <div className="p-3 border-b border-app-700 shrink-0 grid gap-2">
        {/* Title */}
        <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
          <span className="text-[11px] text-app-400 pt-0.5">Title</span>
          <button
            onClick={() => openFile(selectedSong.filePath)}
            className="text-left text-sm text-accent hover:text-white transition-colors font-medium truncate cursor-pointer"
            title={selectedSong.filePath}
          >
            {selectedSong.title}
          </button>
        </div>

        {/* Templates */}
        {selectedSong.recommendedTemplates.length > 0 && (
          <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
            <span className="text-[11px] text-app-400 pt-0.5">Templates</span>
            <span className="text-sm text-app-200">{selectedSong.recommendedTemplates.join(', ')}</span>
          </div>
        )}

        {/* Variants */}
        {variants.length > 0 && (
          <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
            <span className="text-[11px] text-app-400 pt-0.5">Variants</span>
            <div className="grid gap-0.5">
              {variants.map(({ lang, filePath }) => (
                <button
                  key={lang}
                  onClick={() => openFile(filePath)}
                  className="text-left text-sm text-accent hover:text-white transition-colors cursor-pointer"
                  title={filePath}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Song text */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedSong.sections.map((section) => (
          <div key={section.name} className="mb-4">
            <div className="text-[11px] text-app-400 font-medium uppercase tracking-wider mb-2">
              {section.name}
            </div>
            {section.slides.map((slide, slideIdx) => (
              <div key={slide.id} className={`text-sm text-app-100 leading-relaxed ${slideIdx > 0 ? 'mt-3' : ''}`}>
                {(slide.lines[primaryLang] ?? []).map((line, lineIdx) => (
                  <div key={lineIdx}>{line}</div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
