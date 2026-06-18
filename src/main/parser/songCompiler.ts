import { resolve, dirname } from 'path'
import { existsSync } from 'fs'
import type { CompiledSong, CompiledSection, CompiledSlide } from '../../shared/models/Song'
import { parseSongFile, type ParsedSongFile } from './songParser'

export function compileSong(filePath: string, id: string): CompiledSong {
  const main = parseSongFile(filePath)
  const dir = dirname(filePath)

  const titleTranslations: Record<string, string> = {}
  const variantFilePaths: string[] = []
  const variantData: Array<{ langCode: string; parsed: ParsedSongFile }> = []

  for (const v of main.variants) {
    const absPath = resolve(dir, v.relativePath)
    variantFilePaths.push(absPath)
    if (existsSync(absPath)) {
      try {
        const parsed = parseSongFile(absPath)
        variantData.push({ langCode: v.langCode, parsed })
        if (parsed.title) titleTranslations[v.langCode] = parsed.title
      } catch {
        // skip unreadable variant
      }
    }
  }

  const languages = ['primary', ...main.variants.map((v) => v.langCode)]

  const sections: CompiledSection[] = main.sections.map((mainSec) => {
    const slides: CompiledSlide[] = mainSec.slides.map((mainSlide, slideIdx) => {
      const lines: Record<string, string[]> = {
        primary: mainSlide.lines
      }

      for (const { langCode, parsed } of variantData) {
        const variantSec = parsed.sections.find(
          (s) => s.name.toLowerCase() === mainSec.name.toLowerCase()
        )
        if (variantSec && variantSec.slides[slideIdx]) {
          lines[langCode] = variantSec.slides[slideIdx].lines
        } else {
          lines[langCode] = []
        }
      }

      return {
        id: `${mainSec.name}-${slideIdx}`,
        lines
      }
    })

    return {
      name: mainSec.name,
      type: mainSec.type,
      number: mainSec.number,
      slides
    }
  })

  return {
    id,
    filePath,
    title: main.title,
    titleTranslations,
    mood: main.mood,
    recommendedTemplates: main.recommendedTemplates,
    languages,
    copyright: main.copyright,
    sections,
    variantFilePaths
  }
}
