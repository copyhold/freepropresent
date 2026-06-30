# Song Store Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace compile-on-load with lazy compilation — the song library stores lightweight `SongEntry` records (raw metadata + lyrics), and `CompiledSong` is produced only when a song is selected or presented.

**Architecture:** `SongLibrary` becomes a flat map of `SongEntry` objects keyed by absolute file path. On startup it reads and parses only headers; `compile(id)` runs `compileSong()` on demand. The renderer calls `SONGS_GET` on click to get the `CompiledSong` for the detail pane; `PresentationStore` compiles independently when "Start Presenting" is clicked.

**Tech Stack:** Electron 31 · TypeScript 5 · React 18 · Zustand · chokidar · electron-vite

## Global Constraints

- No new npm dependencies
- Never use `@` path aliases — always use relative imports
- `npm run typecheck` must pass after every task before committing
- `Variants:` field is now required in all main/standalone song files (even when empty)
- Absolute file paths are the canonical identifier for all songs throughout the system

---

### Task 1: Add `SongEntry` and `References` types

**Files:**
- Modify: `src/shared/models/Song.ts`

**Interfaces:**
- Produces: `SongEntry`, `ReferenceRole`, `ReferenceEntry`, `References` — consumed by all subsequent tasks

- [ ] **Step 1: Add types to `src/shared/models/Song.ts`**

Open `src/shared/models/Song.ts`. After the existing exports, append:

```ts
export interface SongEntry {
  id: string         // absolute file path
  filePath: string   // same as id
  title: string
  mood: string[]
  updatedAt: string  // ISO 8601 string from file mtime
  lyrics: string     // raw file content (utf-8)
  isVariant: boolean // true when no 'Variants:' field present in header
}

export type ReferenceRole = 'main' | `translation_${string}` | `translit_${string}`

export interface ReferenceEntry {
  key: string      // absolute path of the main/parent song
  role: ReferenceRole
}

export type References = Map<string, ReferenceEntry>
```

Do not remove or modify any existing types (`CompiledSong`, `CompiledSection`, etc. — all unchanged).

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/models/Song.ts
git commit -m "feat: add SongEntry and References types"
```

---

### Task 2: Refactor `SongLibrary`

**Files:**
- Modify: `src/main/store/SongLibrary.ts`

**Interfaces:**
- Consumes: `SongEntry`, `ReferenceEntry`, `References` from Task 1; `compileSong` from `../parser/songCompiler`; `parseSongContent` from `../parser/songParser`
- Produces:
  - `getAll(): SongEntry[]`
  - `get(id: string): SongEntry | undefined`
  - `compile(id: string): CompiledSong | null`
  - `reload(): void`
  - `close(): void`

- [ ] **Step 1: Replace `src/main/store/SongLibrary.ts` entirely**

```ts
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
```

- [ ] **Step 2: Verify references are built correctly**

Add a temporary `console.log` call at the end of `rebuildReferences()` to confirm the map populates as expected during development:

```ts
// in rebuildReferences(), after the third pass — remove before committing
console.debug('[SongLibrary] references rebuilt:', this.references.size, 'entries')
for (const [path, ref] of this.references) {
  console.debug(' ', path.split('/').at(-1), '→', ref.role)
}
```

Run `npm run dev`, open the console in the control window DevTools, and confirm:
- Each main song appears with `role: 'main'`
- Each variant file appears with `role: 'translation_<lang>'` or `role: 'translit_<lang>'`
- `references.size === songs.size` (one entry per file)
- Standalone songs (with empty `Variants:`) appear as `role: 'main'`

Remove the `console.debug` calls before the next step.

- [ ] **Step 3: Type-check**

```bash
npm run typecheck
```

Expected: errors only in files that still reference the old `SongLibrary` API (`PresentationStore`, `ipc/songs.ts`). These are fixed in subsequent tasks. If you see errors in `SongLibrary.ts` itself, fix them before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/main/store/SongLibrary.ts
git commit -m "feat: refactor SongLibrary to store SongEntry, lazy compile, build References"
```

---

### Task 3: Update `PresentationStore`

**Files:**
- Modify: `src/main/store/PresentationStore.ts`

**Interfaces:**
- Consumes: `SongLibrary.get(id): SongEntry | undefined`; `compileSong` from `../../parser/songCompiler`
- Produces: unchanged public API (`loadSong`, `gotoSlide`, etc. — all return `PresentationState`)

- [ ] **Step 1: Replace `src/main/store/PresentationStore.ts` entirely**

```ts
import { BrowserWindow } from 'electron'
import type { PresentationState, OutputRenderPayload, ResolvedSlide } from '../../shared/models/Presentation'
import type { CompiledSong } from '../../shared/models/Song'
import { IPC } from '../../shared/ipc/channels'
import type { SongLibrary } from './SongLibrary'
import type { TemplateLibrary } from './TemplateLibrary'
import type { AppConfigLibrary } from './AppConfigLibrary'
import { compileSong } from '../parser/songCompiler'

const DEFAULT_TEMPLATE_ID = 'default'

function makeInitialState(): PresentationState {
  return {
    activeSongId: null,
    currentSlideIndex: 0,
    templateId: DEFAULT_TEMPLATE_ID,
    outputMode: 'blank',
    output2Mode: 'off',
    totalSlides: 0
  }
}

export class PresentationStore {
  private state: PresentationState = makeInitialState()
  private compiledSong: CompiledSong | null = null

  constructor(
    private songs: SongLibrary,
    private templates: TemplateLibrary,
    private appConfigLib: AppConfigLibrary
  ) {}

  getState(): PresentationState {
    return { ...this.state }
  }

  loadSong(songId: string, templateId?: string): PresentationState {
    const entry = this.songs.get(songId)
    if (!entry || entry.isVariant) return this.state

    const song = compileSong(entry.filePath, songId)
    this.compiledSong = song

    const totalSlides = song.sections.reduce((sum, s) => sum + s.slides.length, 0)

    this.state = {
      ...this.state,
      activeSongId: songId,
      currentSlideIndex: 0,
      templateId: templateId ?? this.state.templateId,
      outputMode: 'live',
      totalSlides,
      songTitle: song.title
    }

    this.broadcast()
    return this.getState()
  }

  gotoSlide(index: number): PresentationState {
    const total = this.state.totalSlides
    if (total === 0) return this.state

    const clamped = Math.max(0, Math.min(index, total - 1))
    this.state = { ...this.state, currentSlideIndex: clamped, outputMode: 'live' }
    this.broadcast()
    return this.getState()
  }

  nextSlide(): PresentationState {
    return this.gotoSlide(this.state.currentSlideIndex + 1)
  }

  prevSlide(): PresentationState {
    return this.gotoSlide(this.state.currentSlideIndex - 1)
  }

  setMode(mode: 'live' | 'blank' | 'logo'): PresentationState {
    this.state = { ...this.state, outputMode: mode }
    this.broadcast()
    return this.getState()
  }

  setTemplate(templateId: string): PresentationState {
    this.state = { ...this.state, templateId }
    this.broadcast()
    return this.getState()
  }

  clear(): PresentationState {
    this.compiledSong = null
    this.state = makeInitialState()
    this.broadcast()
    return this.getState()
  }

  private resolveCurrentSlide(): ResolvedSlide | null {
    if (!this.state.activeSongId || !this.compiledSong) return null

    const { currentSlideIndex } = this.state
    let flat = 0

    for (const section of this.compiledSong.sections) {
      for (let i = 0; i < section.slides.length; i++) {
        if (flat === currentSlideIndex) {
          return {
            slide: section.slides[i],
            sectionName: section.name,
            sectionType: section.type,
            slideIndexInSection: i
          }
        }
        flat++
      }
    }

    return null
  }

  broadcast(): void {
    const { templateId } = this.state
    const template = this.templates.get(templateId) ?? this.templates.getDefault()
    if (!template) return

    const resolvedSlide = this.resolveCurrentSlide()

    const payload: OutputRenderPayload = {
      state: this.getState(),
      slide: resolvedSlide,
      template,
      songTitle: this.compiledSong?.title ?? '',
      songCopyright: this.compiledSong?.copyright,
      appConfig: this.appConfigLib.get()
    }

    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.OUTPUT_RENDER, payload)
      win.webContents.send(IPC.PRESENT_STATE_CHANGED, this.getState())
    }
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: errors only in `src/main/ipc/songs.ts` and renderer files (fixed in later tasks). No errors in `PresentationStore.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/main/store/PresentationStore.ts
git commit -m "feat: PresentationStore compiles song on demand, holds compiledSong"
```

---

### Task 4: Update IPC songs handler

**Files:**
- Modify: `src/main/ipc/songs.ts`

**Interfaces:**
- Consumes: `SongLibrary.getAll(): SongEntry[]`; `SongLibrary.compile(id): CompiledSong | null`
- Produces: `SONGS_LIST` → `SongEntry[]`; `SONGS_GET` → `CompiledSong | null`

- [ ] **Step 1: Update `src/main/ipc/songs.ts`**

Replace the file content with:

```ts
import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc/channels'
import type { SongLibrary } from '../store/SongLibrary'

export function registerSongHandlers(library: SongLibrary): void {
  ipcMain.handle(IPC.SONGS_LIST, () => library.getAll())
  ipcMain.handle(IPC.SONGS_GET, (_e, id: string) => library.compile(id) ?? null)
  ipcMain.handle(IPC.SONGS_RELOAD, () => { library.reload() })
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: errors only in renderer files. No errors in `src/main/`.

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc/songs.ts
git commit -m "feat: SONGS_GET now compiles on demand via library.compile()"
```

---

### Task 5: Update renderer store and `SongList`

**Files:**
- Modify: `src/renderer/control/store/index.ts`
- Modify: `src/renderer/control/components/SongList.tsx`

**Interfaces:**
- Consumes: `SongEntry` (from `../../../shared/models/Song`); `IPC.SONGS_LIST` → `SongEntry[]`; `IPC.SONGS_GET` → `CompiledSong | null`
- Produces: Zustand store with `songs: SongEntry[]`, `selectedSong: CompiledSong | null`, `activeSong: CompiledSong | null`

- [ ] **Step 1: Replace `src/renderer/control/store/index.ts` entirely**

```ts
import { create } from 'zustand'
import type { CompiledSong, SongEntry } from '../../../shared/models/Song'
import type { Template } from '../../../shared/models/Template'
import type { PresentationState } from '../../../shared/models/Presentation'
import { IPC } from '../../../shared/ipc/channels'
import type { SectionType } from '../../../shared/models/Song'

interface AppState {
  songs: SongEntry[]
  templates: Template[]
  presentationState: PresentationState | null
  activeSong: CompiledSong | null
  selectedSong: CompiledSong | null

  loadLibrary: () => Promise<void>
  loadSong: (id: string, templateId?: string) => Promise<void>
  nextSlide: () => Promise<void>
  prevSlide: () => Promise<void>
  gotoSlide: (index: number) => Promise<void>
  gotoSection: (key: string) => void
  setMode: (mode: 'live' | 'blank' | 'logo') => Promise<void>
  setTemplate: (templateId: string) => Promise<void>
  setPresentationState: (state: PresentationState) => void
  reloadLibrary: () => Promise<void>
  selectSong: (id: string | null) => Promise<void>
  clearPresentation: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  songs: [],
  templates: [],
  presentationState: null,
  activeSong: null,
  selectedSong: null,

  loadLibrary: async () => {
    const [songs, templates] = await Promise.all([
      window.electronAPI.invoke!(IPC.SONGS_LIST) as Promise<SongEntry[]>,
      window.electronAPI.invoke!(IPC.TEMPLATES_LIST) as Promise<Template[]>
    ])
    const { selectedSong } = get()
    const refreshedSelectedSong = selectedSong
      ? (await window.electronAPI.invoke!(IPC.SONGS_GET, selectedSong.id) as CompiledSong | null) ?? null
      : null
    set({ songs, templates, selectedSong: refreshedSelectedSong })
  },

  reloadLibrary: async () => {
    await window.electronAPI.invoke!(IPC.SONGS_RELOAD)
    const songs = await window.electronAPI.invoke!(IPC.SONGS_LIST) as SongEntry[]
    const { selectedSong } = get()
    const refreshedSelectedSong = selectedSong
      ? (await window.electronAPI.invoke!(IPC.SONGS_GET, selectedSong.id) as CompiledSong | null) ?? null
      : null
    set({ songs, selectedSong: refreshedSelectedSong })
  },

  selectSong: async (id: string | null) => {
    if (!id) { set({ selectedSong: null }); return }
    const song = await window.electronAPI.invoke!(IPC.SONGS_GET, id) as CompiledSong | null
    set({ selectedSong: song })
  },

  loadSong: async (id: string, templateId?: string) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_LOAD_SONG, {
      songId: id,
      templateId
    })) as PresentationState
    const { selectedSong } = get()
    const activeSong = selectedSong?.id === id
      ? selectedSong
      : (await window.electronAPI.invoke!(IPC.SONGS_GET, id) as CompiledSong | null)
    set({ presentationState: state, activeSong })
  },

  nextSlide: async () => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_NEXT_SLIDE)) as PresentationState
    set({ presentationState: state })
  },

  prevSlide: async () => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_PREV_SLIDE)) as PresentationState
    set({ presentationState: state })
  },

  gotoSlide: async (index: number) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_GOTO_SLIDE, index)) as PresentationState
    set({ presentationState: state })
  },

  gotoSection: (key: string) => {
    const { activeSong } = get()
    if (!activeSong) return

    const typeMap: Partial<Record<string, SectionType>> = { c: 'chorus', b: 'bridge' }
    const digit = parseInt(key, 10)

    let targetSection
    if (!isNaN(digit) && digit > 0) {
      targetSection = activeSong.sections.find((s) => s.type === 'verse' && s.number === digit)
    } else {
      const t = typeMap[key.toLowerCase()]
      if (t) targetSection = activeSong.sections.find((s) => s.type === t)
    }

    if (!targetSection) return

    let flatIndex = 0
    for (const sec of activeSong.sections) {
      if (sec === targetSection) break
      flatIndex += sec.slides.length
    }

    get().gotoSlide(flatIndex)
  },

  setMode: async (mode) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_SET_MODE, mode)) as PresentationState
    set({ presentationState: state })
  },

  setTemplate: async (templateId: string) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_SET_TEMPLATE, templateId)) as PresentationState
    set({ presentationState: state })
  },

  setPresentationState: (state: PresentationState) => {
    set({ presentationState: state })
  },

  clearPresentation: async () => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_CLEAR)) as PresentationState
    set({ presentationState: state, activeSong: null, selectedSong: null })
  }
}))
```

- [ ] **Step 2: Update `src/renderer/control/components/SongList.tsx`**

Replace only the filter line. Change:

```ts
const filtered = songs.filter((s) =>
  s.title.toLowerCase().includes(search.toLowerCase()),
);
```

To:

```ts
const visible = songs.filter((s) => !s.isVariant)
const filtered = visible.filter((s) =>
  s.title.toLowerCase().includes(search.toLowerCase()),
)
```

Also update the `onClick` handler on the list item — `selectSong` is now async, but the call site is fine as fire-and-forget (no change needed to the JSX).

Remove the `song.mood` subtitle render if `mood` is not yet in `SongEntry` — but since Task 1 added `mood: string[]` to `SongEntry`, the existing render code `song.mood.length > 0 && ...` continues to work unchanged.

- [ ] **Step 3: Type-check**

```bash
npm run typecheck
```

Expected: no errors across the entire project.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Verify:
1. Song list loads and shows only main songs (variant files hidden)
2. Clicking a song populates the detail pane (compilation happens on click)
3. "Start Presenting" works — slide navigator shows slides, arrow keys navigate
4. Keyboard section shortcuts (`c`, `b`, `1`, `2`) jump to correct sections
5. "End" button clears the presentation

- [ ] **Step 5: Commit**

```bash
git add src/renderer/control/store/index.ts src/renderer/control/components/SongList.tsx
git commit -m "feat: renderer uses SongEntry list, compiles on song select"
```

---

### Task 6: Update song format docs

**Files:**
- Modify: `docs/SONG_FORMAT.md`

- [ ] **Step 1: Update the header fields table in `docs/SONG_FORMAT.md`**

Find the header fields table (around line 39). Change the `Variants` row:

```markdown
| `Variants` | No | List of `langCode: relative/path.md` pairs |
```

To:

```markdown
| `Variants` | **Required** | List of `langCode: relative/path.md` pairs; use an empty value when there are no variants |
```

- [ ] **Step 2: Add a note after the table**

After the table, add:

```markdown
> **Note:** The `Variants:` field must be present in every main/standalone song file, even when no translations exist. Its presence is how the app distinguishes main songs from translation files. Variant files must never include a `Variants:` field.
```

- [ ] **Step 3: Update the main song example** (around line 10)

The example already shows `Variants:` with entries — no change needed there.

Add a standalone song example below the existing main song example block:

```markdown
**Standalone song (no translations):**

```
Title: Song with no variants
Variants:

---

[Verse 1]
Line one
Line two
```
```

- [ ] **Step 4: Commit**

```bash
git add docs/SONG_FORMAT.md
git commit -m "docs: Variants field required in main song files"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `SongEntry` with id, filePath, title, mood, updatedAt, lyrics, isVariant | Task 1 |
| `References` type defined | Task 1 |
| SongLibrary keyed by abs path, stores `SongEntry` | Task 2 |
| `isVariant = !hasDeclaredVariantsField` | Task 2 |
| Recursive variant loading during scan | Task 2 |
| References rebuilt after initial scan and each post-scan change | Task 2 |
| `SongLibrary.compile(id)` on demand | Task 2 |
| `variantIndex` and `filePathToId` removed | Task 2 |
| `PresentationStore` holds `compiledSong`, compiles on `loadSong` | Task 3 |
| `PresentationStore.clear()` nulls `compiledSong` | Task 3 |
| `SONGS_LIST` → `SongEntry[]` | Task 4 |
| `SONGS_GET` → `CompiledSong | null` via `library.compile()` | Task 4 |
| Renderer `songs: SongEntry[]` | Task 5 |
| `selectSong` calls `SONGS_GET` | Task 5 |
| `loadSong` sets `activeSong` from `selectedSong` or `SONGS_GET` | Task 5 |
| `setPresentationState` simplified (no `activeSong` update) | Task 5 |
| `SongList` filters `!isVariant` | Task 5 |
| `SONG_FORMAT.md` updated | Task 6 |

All spec requirements covered. No placeholders. Types are consistent across tasks (`SongEntry.id` is used as the IPC key throughout; `selectSong` return type changed to `Promise<void>` in the interface definition in Task 5).
