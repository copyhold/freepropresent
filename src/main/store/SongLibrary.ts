import { watch, type FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { extname, dirname, resolve } from 'path'
import { readFileSync, statSync, existsSync } from 'fs'
import type { CompiledSong, SongEntry, ReferenceEntry, ReferenceRole } from '../../shared/models/Song'
import type { LibraryChangedEvent } from '../../shared/models/Presentation'
import { IPC } from '../../shared/ipc/channels'
import { compileSong } from '../parser/songCompiler'
import { parseSongContent } from '../parser/songParser'

export class SongLibrary {
  private songs = new Map<string, SongEntry>()
  private references = new Map<string, ReferenceEntry>()
  private watchers: FSWatcher[] = []
  private songDirs: string[] = []
  private initialScanComplete = false

  async load(songDirs: string[]): Promise<void> {
    this.songDirs = songDirs
    this.songs.clear()
    this.references.clear()
    this.initialScanComplete = false

    for (const w of this.watchers) w.close()
    this.watchers = []

    const readyPromises: Promise<void>[] = []

    for (const dir of songDirs) {
      const watcher = watch(dir, {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      })
      watcher.on('add', (path) => this.handleFile(path, 'added'))
      watcher.on('change', (path) => this.handleFile(path, 'changed'))
      watcher.on('unlink', (path) => this.handleRemove(path))
      this.watchers.push(watcher)
      readyPromises.push(
        new Promise<void>((resolve) => watcher.on('ready', resolve)),
      )
    }

    await Promise.all(readyPromises)
    this.initialScanComplete = true
    this.rebuildReferences()
  }

  private handleFile(filePath: string, action: 'added' | 'changed'): void {
    if (extname(filePath) !== '.md') return
    this.loadEntry(filePath, action)
  }

  private loadEntry(filePath: string, action: 'added' | 'changed' = 'changed'): void {
    // Skip files already loaded during the initial scan (e.g. variants pre-loaded by their parent)
    if (action === 'added' && this.songs.has(filePath)) return

    try {
      const raw = readFileSync(filePath, 'utf-8')
      const stat = statSync(filePath)
      const parsed = parseSongContent(raw)

      const hasVariantsField = /^Variants\s*:/im.test(raw)
      const isVariant = !hasVariantsField

      const entry: SongEntry = {
        id: filePath,
        filePath,
        title: parsed.title,
        mood: parsed.mood,
        updatedAt: stat.mtime.toISOString(),
        lyrics: raw,
        isVariant,
      }

      this.songs.set(filePath, entry)

      if (!isVariant) {
        const dir = dirname(filePath)
        for (const variant of parsed.variants) {
          const variantPath = resolve(dir, variant.relativePath)
          if (existsSync(variantPath)) {
            this.loadEntry(variantPath, 'added')
          }
        }
      }

      if (this.initialScanComplete) {
        this.rebuildReferences()
        this.notify({ type: 'song', id: filePath, action })
      }
    } catch (err) {
      console.error('Failed to load entry:', filePath, err)
    }
  }

  private handleRemove(filePath: string): void {
    if (extname(filePath) !== '.md') return
    if (!this.songs.has(filePath)) return

    this.songs.delete(filePath)
    this.references.delete(filePath)

    if (this.initialScanComplete) {
      this.rebuildReferences()
      this.notify({ type: 'song', id: filePath, action: 'removed' })
    }
  }

  private rebuildReferences(): void {
    this.references.clear()

    // Mark all main songs as 'main' referencing themselves
    for (const [path, entry] of this.songs) {
      if (!entry.isVariant) {
        this.references.set(path, { key: path, role: 'main' })
      }
    }

    // Add variant entries derived from each main song's declared variants
    for (const [path, entry] of this.songs) {
      if (entry.isVariant) continue
      const parsed = parseSongContent(entry.lyrics)
      const dir = dirname(path)

      for (const variant of parsed.variants) {
        const variantPath = resolve(dir, variant.relativePath)
        const langCode = variant.langCode
        const role: ReferenceRole = langCode.startsWith('translit-')
          ? `translit_${langCode.slice('translit-'.length)}`
          : `translation_${langCode}`
        this.references.set(variantPath, { key: path, role })
      }
    }

    // Fallback: any file not yet in references gets treated as a standalone main
    for (const [path] of this.songs) {
      if (!this.references.has(path)) {
        this.references.set(path, { key: path, role: 'main' })
      }
    }
  }

  private notify(event: LibraryChangedEvent): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.LIBRARY_CHANGED, event)
    }
  }

  compile(id: string): CompiledSong | null {
    const entry = this.songs.get(id)
    if (!entry) return null
    return compileSong(entry.filePath, id)
  }

  getAll(): SongEntry[] {
    return Array.from(this.songs.values())
  }

  get(id: string): SongEntry | undefined {
    return this.songs.get(id)
  }

  reload(): void {
    this.songs.clear()
    this.references.clear()
    this.initialScanComplete = false
    if (this.songDirs.length) this.load(this.songDirs)
  }

  close(): void {
    for (const w of this.watchers) w.close()
    this.watchers = []
  }
}
