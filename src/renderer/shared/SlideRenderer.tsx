import type { OutputRenderPayload } from '@shared/models/Presentation'
import { Background } from './Background'
import { SlidePart } from './SlidePart'

interface Props {
  payload: OutputRenderPayload
}

export function SlideRenderer({ payload }: Props) {
  const { slide, template, songTitle, songCopyright, state } = payload

  if (state.outputMode !== 'live' || !slide) {
    return <div className="relative w-full h-full overflow-hidden bg-black"><Background background={{ type: 'color', color: '#000' }} /></div>
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <Background background={template.background} />
      {template.parts.map((part) => {
        let lines: string[] = []

        switch (part.role) {
          case 'primary':
            lines = slide.slide.lines['primary'] ?? []
            break
          case 'translation':
            lines = part.languageCode ? (slide.slide.lines[part.languageCode] ?? []) : []
            break
          case 'title':
            lines = [songTitle]
            break
          case 'copyright':
            lines = songCopyright ? [songCopyright] : []
            break
          case 'section-label':
            lines = [slide.sectionName]
            break
          case 'custom':
            lines = part.staticText ? [part.staticText] : []
            break
        }

        if (part.hideWhenEmpty && lines.every((l) => !l.trim())) return null

        return <SlidePart key={part.id} part={part} lines={lines} />
      })}
    </div>
  )
}
