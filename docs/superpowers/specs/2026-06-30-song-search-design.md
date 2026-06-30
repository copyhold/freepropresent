# Song Full-Text Search — Design Spec

**Date:** 2026-06-30

## Problem

The existing search box in `SongList` filters by song title only. Operators need to find songs by remembering a lyric phrase, not necessarily the title.

## Goal

Extend the existing search box to search the full content of each song file — title plus all lyric lines across all languages — using exact substring matching.

## Scope

- **In scope:** client-side filter of the song list based on full text content
- **Out of scope:** fuzzy matching, search ranking, result highlighting, IPC changes, new dependencies

## Approach

Pure client-side substring search. All `CompiledSong` data (including every lyric line in every language) is already loaded into the renderer's Zustand `songs` store via `IPC.SONGS_LIST` on startup. No additional data fetching is required.

## Changes

### 1. `src/renderer/control/utils/songMatchesQuery.ts` (new file)

```ts
import type { CompiledSong } from '../../../shared/models/Song'

export function songMatchesQuery(song: CompiledSong, query: string): boolean {
  const q = query.toLowerCase()
  if (song.title.toLowerCase().includes(q)) return true
  for (const section of song.sections) {
    for (const slide of section.slides) {
      for (const lines of Object.values(slide.lines)) {
        for (const line of lines) {
          if (line.toLowerCase().includes(q)) return true
        }
      }
    }
  }
  return false
}
```

Short-circuits on first match. No dependencies beyond the existing `CompiledSong` type.

### 2. `src/renderer/control/components/SongList.tsx` (edit)

Replace the existing filter:

```ts
// before
const filtered = songs.filter((s) =>
  s.title.toLowerCase().includes(search.toLowerCase()),
)

// after
const filtered = search
  ? songs.filter((s) => songMatchesQuery(s, search))
  : songs
```

The guard `search ? ... : songs` avoids iterating all lyric content on every render when the search box is empty.

## Data flow

```
Zustand store (songs: CompiledSong[])
  └─ SongList reads songs
       └─ filter via songMatchesQuery(song, query)
            ├─ checks song.title
            └─ checks all section → slide → language → line text
```

## No changes required in

- Main process / IPC handlers
- Zustand store
- Preload scripts
- Any other renderer component
