import { watch, type FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { basename, extname, relative } from 'path'
import type { CompiledSong } from '../../shared/models/Song'
import type { LibraryChangedEvent } from '../../shared/models/Presentation'
import { IPC } from '../../shared/ipc/channels'
import { compileSong } from '../parser/songCompiler'

export class SongLibrary {
  private songs = new Map<string, CompiledSong>()
  private variantIndex = new Map<string, string>() // variantAbsPath → songId
  private watchers: FSWatcher[] = []
  private songDirs: string[] = []

  async load(songDirs: string[]): Promise<void> {
    this.songDirs = songDirs
    for (const w of this.watchers) w.close()
    this.watchers = []

    for (const dir of songDirs) {
      const watcher = watch(dir, {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
      })
      watcher.on('add', (path) => this.handleFile(dir, path, 'added'))
      watcher.on('change', (path) => this.handleFile(dir, path, 'changed'))
      watcher.on('unlink', (path) => this.handleRemove(dir, path))
      this.watchers.push(watcher)
    }
  }

  private handleFile(dir: string, filePath: string, action: 'added' | 'changed'): void {
    if (extname(filePath) !== '.md') return

    if (this.variantIndex.has(filePath)) {
      const songId = this.variantIndex.get(filePath)!
      const song = this.songs.get(songId)
      if (song) this.loadSong(dir, song.filePath)
      return
    }

    const stem = basename(filePath, '.md')
    if (stem.includes('.')) return

    this.loadSong(dir, filePath, action)
  }

  private loadSong(dir: string, filePath: string, action: 'added' | 'changed' = 'changed'): void {
    try {
      const id = this.filePathToId(dir, filePath)
      const song = compileSong(filePath, id)
      this.songs.set(id, song)

      for (const varPath of song.variantFilePaths) {
        this.variantIndex.set(varPath, id)
      }

      this.notify({ type: 'song', id, action })
    } catch (err) {
      console.error('Failed to load song:', filePath, err)
    }
  }

  private handleRemove(dir: string, filePath: string): void {
    if (extname(filePath) !== '.md') return

    const id = this.filePathToId(dir, filePath)
    if (this.songs.has(id)) {
      const song = this.songs.get(id)!
      for (const varPath of song.variantFilePaths) {
        this.variantIndex.delete(varPath)
      }
      this.songs.delete(id)
      this.notify({ type: 'song', id, action: 'removed' })
    }
  }

  // Namespace by folder index to avoid collisions across directories.
  // Songs in the first (default) dir keep bare stems for backwards compatibility.
  private filePathToId(dir: string, filePath: string): string {
    const stem = basename(filePath, '.md')
    const dirIndex = this.songDirs.indexOf(dir)
    if (dirIndex <= 0) return stem
    // Use relative path from dir root as the id for extra folders
    const rel = relative(dir, filePath).replace(/\.md$/, '').replace(/\\/g, '/')
    return `${dirIndex}:${rel}`
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
    if (this.songDirs.length) this.load(this.songDirs)
  }

  close(): void {
    for (const w of this.watchers) w.close()
    this.watchers = []
  }
}
