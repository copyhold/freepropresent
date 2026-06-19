import { useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { TemplatePart } from '../../shared/models/Template'

const RTL_LANGS = new Set(['he', 'ar', 'fa', 'ur'])

interface Props {
  part: TemplatePart
  lines: string[]
  minFontSize?: number
  maxFontSize?: number
}

export function SlidePart({ part, lines, minFontSize, maxFontSize }: Props) {
  const { geometry, style, verticalAlign = 'top', languageCode } = part
  const isRtl = languageCode ? RTL_LANGS.has(languageCode) : false
  const autoScale = minFontSize != null && maxFontSize != null

  const containerRef = useRef<HTMLDivElement>(null)
  const [scaledFontSize, setScaledFontSize] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    if (!autoScale || !containerRef.current) return

    const el = containerRef.current
    let lo = minFontSize!
    let hi = maxFontSize!

    const measure = () => {
      lo = minFontSize!
      hi = maxFontSize!
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2
        el.style.fontSize = `${mid}px`
        const fits = el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth
        if (fits) {
          lo = mid
        } else {
          hi = mid
        }
      }
      el.style.fontSize = `${lo}px`
      setScaledFontSize(lo)
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [lines, autoScale, minFontSize, maxFontSize, style.fontFamily, style.fontWeight, style.lineHeight, style.letterSpacing])

  const effectiveFontSize = autoScale
    ? (scaledFontSize ?? maxFontSize)
    : style.fontSize

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${geometry.left}%`,
    top: `${geometry.top}%`,
    width: `${geometry.width}%`,
    height: `${geometry.height}%`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent:
      verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
    overflow: 'hidden',
    direction: isRtl ? 'rtl' : 'ltr',
    fontFamily: style.fontFamily,
    fontSize: effectiveFontSize ? `${effectiveFontSize}px` : undefined,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
    textShadow: style.textShadow,
    textTransform: style.textTransform
  }

  const markdown = lines.join('  \n')

  return (
    <div ref={containerRef} style={containerStyle}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <span style={{ display: 'block' }}>{children}</span>,
          h1: ({ children }) => <span style={{ display: 'block' }}>{children}</span>,
          h2: ({ children }) => <span style={{ display: 'block' }}>{children}</span>,
          h3: ({ children }) => <span style={{ display: 'block' }}>{children}</span>
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
