import { watch, type FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { basename, extname } from 'path'
import type { CompiledSong } from '../../shared/models/Song'
import type { LibraryChangedEvent } from '../../shared/models/Presentation'
import { IPC } from '../../shared/ipc/channels'
import { compileSong } from '../parser/songCompiler'

export class SongLibrary {
  private songs = new Map<string, CompiledSong>()
  private variantIndex = new Map<string, string>() // variantAbsPath → songId
  private watcher: FSWatcher | null = null
  private songsDir = ''

  async load(songsDir: string): Promise<void> {
    this.songsDir = songsDir
    this.watcher?.close()

    this.watcher = watch(songsDir, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
    })

    this.watcher.on('add', (path) => this.handleFile(path, 'added'))
    this.watcher.on('change', (path) => this.handleFile(path, 'changed'))
    this.watcher.on('unlink', (path) => this.handleRemove(path))
  }

  private isVariant(filePath: string): boolean {
    return this.variantIndex.has(filePath)
  }

  private handleFile(filePath: string, action: 'added' | 'changed'): void {
    if (extname(filePath) !== '.md') return

    if (this.variantIndex.has(filePath)) {
      // Recompile parent
      const songId = this.variantIndex.get(filePath)!
      const song = this.songs.get(songId)
      if (song) this.loadSong(song.filePath)
      return
    }

    // Check if it looks like a variant file (has multiple dots in stem, e.g. amazing-grace.he.md)
    // Only load top-level songs here; variants are loaded via compileSong
    const stem = basename(filePath, '.md')
    if (stem.includes('.')) {
      // Might be a variant — check if any song claims it
      // If not yet indexed, skip — the parent will pick it up
      return
    }

    this.loadSong(filePath, action)
  }

  private loadSong(filePath: string, action: 'added' | 'changed' = 'changed'): void {
    try {
      const id = this.filePathToId(filePath)
      const song = compileSong(filePath, id)
      this.songs.set(id, song)

      // Update variant index
      for (const varPath of song.variantFilePaths) {
        this.variantIndex.set(varPath, id)
      }

      this.notify({ type: 'song', id, action })
    } catch (err) {
      console.error('Failed to load song:', filePath, err)
    }
  }

  private handleRemove(filePath: string): void {
    if (extname(filePath) !== '.md') return

    const id = this.filePathToId(filePath)
    if (this.songs.has(id)) {
      const song = this.songs.get(id)!
      for (const varPath of song.variantFilePaths) {
        this.variantIndex.delete(varPath)
      }
      this.songs.delete(id)
      this.notify({ type: 'song', id, action: 'removed' })
    }
  }

  private filePathToId(filePath: string): string {
    return basename(filePath, '.md')
  }

  private notify(event: LibraryChangedEvent): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.LIBRARY_CHANGED, event)
    }
  }

  getAll(): CompiledSong[] {
    return Array.from(this.songs.values())
  }

  get(id: string): CompiledSong | undefined {
    return this.songs.get(id)
  }

  reload(): void {
    this.songs.clear()
    this.variantIndex.clear()
    if (this.songsDir) this.load(this.songsDir)
  }

  close(): void {
    this.watcher?.close()
  }
}
