# Song Store Refactor — Design Spec

**Date:** 2026-06-30

## Problem

The current `SongLibrary` compiles every song on startup — parsing lyrics, resolving all variant files, and building `CompiledSong` objects for the full library. This is wasteful: the song list only needs lightweight metadata (title, path, mtime), and the compiled structure is only needed when a song is selected or presented.

## Goal

Replace the compile-on-load approach with a two-phase model:

- **Phase 1 (startup/watch):** read raw file content, parse header only, store lightweight `SongEntry` per file.
- **Phase 2 (on demand):** compile a song into `CompiledSong` only when the user clicks it or starts presenting.

Only one `CompiledSong` lives in the main process at a time (the active presentation). The renderer holds at most two (selected + active).

## Supersedes

`2026-06-30-song-search-design.md` — that spec introduced `SongSummary` but still compiled on startup. This design replaces it entirely. The `SongSummary` type is dropped.

---

## Song Format Convention Change

**`Variants:` is now required in every main/standalone song file**, even when empty:

```
Title: My Song
Variants:

---

[Verse 1]
...
```

Variant/translation files must never include a `Variants:` field. This makes the `isVariant` flag unambiguous: absence of `Variants:` in the raw header means the file is a variant.

`SONG_FORMAT.md` must be updated to reflect this (change `Variants` from "No" to "Required" in the main file header table).

---

## Data Model (`src/shared/models/Song.ts`)

### New: `SongEntry`

```ts
export interface SongEntry {
  id: string         // absolute file path
  filePath: string   // same as id
  title: string
  mood: string[]     // parsed from header; shown as subtitle in SongList
  updatedAt: string  // ISO string from file mtime
  lyrics: string     // raw file content (utf-8)
  isVariant: boolean // true when no 'Variants:' field in header
}
```

### New: `References` (defined now, populated later)

```ts
export type ReferenceRole = 'main' | `translation_${string}` | `translit_${string}`

export interface ReferenceEntry {
  key: string      // abs path of the main/parent song
  role: ReferenceRole
}

export type References = Map<string, ReferenceEntry>
```

`References` is a separate map, same size as `SongLibrary` — every file has exactly one entry. It is built after all files are loaded and is intentionally kept separate from `SongLibrary` (two maps, two concerns).

`CompiledSong` and all types below it in `Song.ts` are unchanged.

---

## SongLibrary (`src/main/store/SongLibrary.ts`)

### Storage

```ts
private songs = new Map<string, SongEntry>()    // keyed by absolute file path
private references = new Map<string, ReferenceEntry>()
```

`variantIndex` and `filePathToId` are removed entirely.

### Load process (per file)

```
1. Skip if abs path already in songs
2. Read raw content (readFileSync) + stat mtime
3. Parse header → title, variants list
4. isVariant = no 'Variants:' field present in raw header
5. Store SongEntry in songs
6. If !isVariant: resolve each variant path (relative → abs) and load recursively (go to 1)
```

The recursive step ensures variant files are in the library before the watcher discovers them independently, preventing double processing.

### References build

After the initial directory scan completes, rebuild `references`:

- For each main song (`!isVariant`): add `{ key: selfPath, role: 'main' }` for itself, and for each declared variant add `{ key: mainPath, role: 'translation_<lang>' | 'translit_<lang>' }`.
- Lang codes starting with `translit-` map to `translit_<remainder>`; all others map to `translation_<lang>`.
- Any file in `songs` with no `references` entry (e.g. an orphaned variant with a broken parent reference) gets `{ key: selfPath, role: 'main' }` as a fallback.

### File watch events

- **add / change:** re-run the per-file load process; if the file is a main song, also reload its declared variants and rebuild the references for the affected group.
- **unlink:** remove the entry from `songs` and `references`; notify renderer via `IPC.LIBRARY_CHANGED`.

### New method

```ts
compile(id: string): CompiledSong | null
```

Calls `compileSong(entry.filePath, id)` on demand. No caching — compilation happens in the caller's scope.

### Changed signatures

| Method | Before | After |
|---|---|---|
| `getAll()` | `CompiledSong[]` | `SongEntry[]` |
| `get(id)` | `CompiledSong \| undefined` | `SongEntry \| undefined` |
| `compile(id)` | — (new) | `CompiledSong \| null` |

---

## PresentationStore (`src/main/store/PresentationStore.ts`)

Add a private field:

```ts
private compiledSong: CompiledSong | null = null
```

**`loadSong(songId, templateId?)`:** fetch `SongEntry` from `SongLibrary`, call `compileSong(entry.filePath, songId)`, store in `this.compiledSong`. Compute `totalSlides` from compiled sections as before.

**`resolveCurrentSlide()`** and **`broadcast()`:** use `this.compiledSong` instead of `this.songs.get(activeSongId)`.

**`clear()`:** set `this.compiledSong = null`.

---

## IPC (`src/main/ipc/songs.ts`)

```ts
ipcMain.handle(IPC.SONGS_LIST, () => library.getAll())           // returns SongEntry[]
ipcMain.handle(IPC.SONGS_GET,  (_e, id) => library.compile(id) ?? null)  // returns CompiledSong | null
ipcMain.handle(IPC.SONGS_RELOAD, () => { library.reload() })
```

No preload script changes required — `electronAPI.invoke` is already generic.

---

## Renderer Store (`src/renderer/control/store/index.ts`)

### Type changes

```ts
songs: SongEntry[]           // was CompiledSong[]
selectedSong: CompiledSong | null   // unchanged type, now fetched lazily
activeSong: CompiledSong | null     // unchanged
```

### Behaviour changes

**`selectSong(id)`**
```ts
// before: local array lookup
const song = songs.find(s => s.id === id)
set({ selectedSong: song })

// after: IPC call to compile on demand
const song = await window.electronAPI.invoke!(IPC.SONGS_GET, id)
set({ selectedSong: song })
```

**`loadSong(id, templateId?)`**
After `PRESENT_LOAD_SONG` returns `PresentationState`, set `activeSong`:
```ts
const { selectedSong } = get()
const activeSong = selectedSong?.id === id
  ? selectedSong
  : await window.electronAPI.invoke!(IPC.SONGS_GET, id)
set({ presentationState: state, activeSong })
```
Reuses `selectedSong` (already compiled) when the user starts presenting the currently selected song — the common path.

**`setPresentationState(state)`**
```ts
// before: tried to find activeSong from songs array
// after: only updates presentationState; activeSong is managed by loadSong/clearPresentation
set({ presentationState: state })
```

**`loadLibrary` / `reloadLibrary`**
Refresh `selectedSong` by re-fetching via `SONGS_GET` if a song was selected (was a `songs.find()` lookup).

---

## UI Components

### `SongList`

Add an `isVariant` filter before the search filter:

```ts
// before
const filtered = songs.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))

// after
const visible = songs.filter(s => !s.isVariant)
const filtered = visible.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
```

No other changes — `song.id` and `song.title` are the same fields.

### `SongDetailPane`, `SlideNavigator`, `OutputPreview`

No changes — they receive `CompiledSong` via `selectedSong` / `activeSong` as before.

---

## Data Flow

```
Startup / file watch
  readFileSync → parse header → SongEntry (no compilation)
  IPC.SONGS_LIST → SongEntry[]

User clicks song in list
  IPC.SONGS_GET → compileSong() → CompiledSong → renderer.selectedSong

User clicks "Start Presenting"
  IPC.PRESENT_LOAD_SONG → PresentationStore.loadSong()
    → compileSong() → PresentationStore.compiledSong (main process)
    → renderer.activeSong = selectedSong (renderer, reuses compiled result)

Slide navigation (next/prev/goto)
  PresentationStore uses this.compiledSong (already in memory)
  No recompilation
```

---

## Files Changed

| File | Change |
|---|---|
| `src/shared/models/Song.ts` | Add `SongEntry`, `ReferenceRole`, `ReferenceEntry`, `References` |
| `src/main/store/SongLibrary.ts` | Full refactor: `SongEntry` store, new load process, abs-path keys, `references` map, `compile()` method |
| `src/main/ipc/songs.ts` | `SONGS_GET` calls `library.compile(id)` |
| `src/main/store/PresentationStore.ts` | Add `compiledSong` field; `loadSong` compiles directly |
| `src/renderer/control/store/index.ts` | `songs: SongEntry[]`, lazy `selectSong`, simplified `setPresentationState` |
| `src/renderer/control/components/SongList.tsx` | Add `!s.isVariant` filter |
| `docs/SONG_FORMAT.md` | `Variants:` required in main files |
| `docs/superpowers/specs/2026-06-30-song-search-design.md` | Note: superseded by this spec |

No changes to preload scripts, output window, template system, or config system.
