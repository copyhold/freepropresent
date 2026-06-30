# Song Full-Text Search — Design Spec

**Date:** 2026-06-30

## Problem

The existing search box in `SongList` filters by song title only. Operators need to find songs by remembering a lyric phrase, not necessarily the title.

## Goal

Extend the existing search box to search the full content of each song — title plus all lyric lines across all languages — using exact substring matching. Search must be a single string comparison per song in the renderer (no nested loops at query time).

## Scope

- **In scope:** client-side filter of the song list based on full text content; lazy compilation of `CompiledSong` on song click
- **Out of scope:** fuzzy matching, search ranking, result highlighting, new npm dependencies

## Architecture

### Two-phase song loading

**Phase 1 — list (startup):** The main process compiles each song as before, then builds a flat `searchText` string from all compiled data (title + all lyric lines in all languages). Only a lightweight `SongSummary` is sent to the renderer.

**Phase 2 — detail (on click):** The renderer fetches the full `CompiledSong` via `IPC.SONGS_GET` when the user selects a song. The detail pane and slide navigator remain unchanged.

## Data model changes

### `src/shared/models/Song.ts`

Add a new interface:

```ts
export interface SongSummary {
  id: string
  filePath: string
  title: string
  mood: string[]
  searchText: string  // flat lowercase string: title + all lyrics in all languages
}
```

`CompiledSong` stays unchanged — it is still the authoritative model for the detail pane and presentation.

## Changes

### 1. `src/main/store/SongLibrary.ts`

- Add `private summaries = new Map<string, SongSummary>()`.
- In `loadSong`, after calling `compileSong`, build `searchText` by joining all lines from all sections/slides/all language keys into a single lowercased string.
- Store summary in `summaries`; keep the compiled song in `songs` for on-demand retrieval.
- Change `getAll()` to return `SongSummary[]` (from `summaries`).
- `get(id)` continues to return `CompiledSong | undefined` (used by the existing `SONGS_GET` IPC handler and `PresentationStore`).
- Clear `summaries` alongside `songs` in `handleRemove` and `reload`.

`buildSearchText` helper (private, in `SongLibrary`):
```ts
private buildSearchText(song: CompiledSong): string {
  const parts: string[] = [song.title, ...Object.values(song.titleTranslations)]
  for (const section of song.sections) {
    for (const slide of section.slides) {
      for (const lines of Object.values(slide.lines)) {
        parts.push(...lines)
      }
    }
  }
  return parts.join('\n').toLowerCase()
}
```

This runs once per song at load time, not on every keystroke.

### 2. `src/renderer/control/store/index.ts`

- Change `songs: CompiledSong[]` → `songs: SongSummary[]`.
- `selectSong(id)`: fetch full `CompiledSong` via `window.electronAPI.invoke!(IPC.SONGS_GET, id)` and set `selectedSong`. (Previously it did a local array lookup — now it makes a cheap IPC call.)
- Import `SongSummary` instead of (or alongside) `CompiledSong` where needed.

### 3. `src/renderer/control/components/SongList.tsx`

Replace the filter:

```ts
// before
const filtered = songs.filter((s) =>
  s.title.toLowerCase().includes(search.toLowerCase()),
)

// after
const filtered = search
  ? songs.filter((s) => s.searchText.includes(search.toLowerCase()))
  : songs
```

No other changes — the input box, empty state, and list item rendering are unaffected (they only use `id`, `title`, `mood`).

## Data flow

```
Main process (compilation)
  compileSong() → CompiledSong
  buildSearchText(song) → searchText
  summaries.set(id, { id, filePath, title, mood, searchText })

IPC.SONGS_LIST → SongSummary[]     (startup, lightweight)
IPC.SONGS_GET  → CompiledSong      (on song click, existing handler)

Renderer Zustand store
  songs: SongSummary[]
  selectedSong: CompiledSong | null  ← fetched lazily on click

SongList filter
  s.searchText.includes(query)       ← single string op per song
```

## No changes required in

- `src/main/ipc/songs.ts` — `SONGS_GET` handler already exists
- `src/main/parser/songParser.ts` / `songCompiler.ts`
- `src/renderer/control/components/SongDetailPane.tsx`
- `src/renderer/control/components/SlideNavigator.tsx`
- Preload scripts
- Output window
