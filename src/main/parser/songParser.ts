import { readFileSync } from 'fs'
import type { SectionType } from '../../shared/models/Song'

export interface RawSlide {
  lines: string[]
}

export interface RawSection {
  name: string
  type: SectionType
  number?: number
  slides: RawSlide[]
}

export interface ParsedSongFile {
  title: string
  mood: string[]
  recommendedTemplates: string[]
  language: string
  copyright?: string
  variants: Array<{ langCode: string; relativePath: string }>
  sections: RawSection[]
}

export function parseSectionName(name: string): { type: SectionType; number?: number } {
  const lower = name.toLowerCase().trim()

  const verseMatch = lower.match(/^verse\s*(\d+)?$/)
  if (verseMatch) {
    return { type: 'verse', number: verseMatch[1] ? parseInt(verseMatch[1], 10) : 1 }
  }
  if (lower === 'chorus') return { type: 'chorus' }
  if (lower === 'bridge') return { type: 'bridge' }
  if (lower === 'pre-chorus' || lower === 'pre chorus') return { type: 'pre-chorus' }
  if (lower === 'intro') return { type: 'intro' }
  if (lower === 'outro') return { type: 'outro' }

  return { type: 'custom' }
}

export function parseSongFile(filePath: string): ParsedSongFile {
  const content = readFileSync(filePath, 'utf-8')
  return parseSongContent(content)
}

export function parseSongContent(content: string): ParsedSongFile {
  const lines = content.split('\n')

  // Find separator line
  let separatorIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^-{3,}/.test(lines[i].trim())) {
      separatorIdx = i
      break
    }
  }

  const headerLines = separatorIdx >= 0 ? lines.slice(0, separatorIdx) : []
  const bodyLines = separatorIdx >= 0 ? lines.slice(separatorIdx + 1) : lines

  const header = parseHeader(headerLines)
  const sections = parseBody(bodyLines)

  return { ...header, sections }
}

function parseHeader(lines: string[]): Omit<ParsedSongFile, 'sections'> {
  let title = ''
  let mood: string[] = []
  let recommendedTemplates: string[] = []
  let language = 'primary'
  let copyright: string | undefined
  const variants: Array<{ langCode: string; relativePath: string }> = []

  let inVariants = false

  for (const line of lines) {
    if (!line.trim()) {
      inVariants = false
      continue
    }

    if (inVariants) {
      const variantMatch = line.match(/^\s*-\s*([^:]+):\s*(.+)$/)
      if (variantMatch) {
        variants.push({ langCode: variantMatch[1].trim(), relativePath: variantMatch[2].trim() })
      }
      continue
    }

    const kvMatch = line.match(/^([^:]+):\s*(.*)$/)
    if (!kvMatch) continue

    const key = kvMatch[1].trim().toLowerCase()
    const value = kvMatch[2].trim()

    switch (key) {
      case 'title':
        title = value
        break
      case 'mood':
        mood = value.split(',').map((s) => s.trim()).filter(Boolean)
        break
      case 'template':
        recommendedTemplates = value.split(',').map((s) => s.trim()).filter(Boolean)
        break
      case 'language':
        language = value
        break
      case 'copyright':
        copyright = value
        break
      case 'variants':
        inVariants = true
        break
    }
  }

  return { title, mood, recommendedTemplates, language, copyright, variants }
}

function parseBody(lines: string[]): RawSection[] {
  const sections: RawSection[] = []
  let currentSection: RawSection | null = null
  let currentSlideLines: string[] = []

  const pushSlide = () => {
    if (currentSection && currentSlideLines.length > 0) {
      currentSection.slides.push({ lines: [...currentSlideLines] })
      currentSlideLines = []
    } else {
      currentSlideLines = []
    }
  }

  for (const line of lines) {
    const sectionMatch = line.match(/^\[(.+)\]$/)
    if (sectionMatch) {
      pushSlide()
      const name = sectionMatch[1].trim()
      const { type, number } = parseSectionName(name)
      currentSection = { name, type, number, slides: [] }
      sections.push(currentSection)
      continue
    }

    if (!currentSection) continue

    if (line.trim() === '') {
      pushSlide()
    } else {
      currentSlideLines.push(line)
    }
  }

  pushSlide()

  return sections
}
