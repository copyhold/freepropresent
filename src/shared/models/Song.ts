export type SectionType = 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'intro' | 'outro' | 'custom'

export interface CompiledSlide {
  id: string
  lines: Record<string, string[]>
}

export interface CompiledSection {
  name: string
  type: SectionType
  number?: number
  slides: CompiledSlide[]
}

export interface SongEntry {
  id: string         // absolute file path
  filePath: string   // same as id
  title: string
  mood: string[]
  updatedAt: string  // ISO 8601 string from file mtime
  lyrics: string     // raw file content (utf-8)
  isVariant: boolean // true when no 'Variants:' field present in header
  mainSongId?: string // filePath of the parent main song (set only for variants)
}

export type ReferenceRole = 'main' | `translation_${string}` | `translit_${string}`

export interface ReferenceEntry {
  key: string      // absolute path of the main/parent song
  role: ReferenceRole
}

export type References = Map<string, ReferenceEntry>

export interface CompiledSong {
  id: string
  filePath: string
  title: string
  titleTranslations: Record<string, string>
  mood: string[]
  recommendedTemplates: string[]
  languages: string[]
  copyright?: string
  sections: CompiledSection[]
  variantFilePaths: string[]
}
