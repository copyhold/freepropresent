import { useState } from 'react'
import { useAppStore } from '../store'

export function SongList() {
  const songs = useAppStore((s) => s.songs)
  const loadSong = useAppStore((s) => s.loadSong)
  const presentationState = useAppStore((s) => s.presentationState)
  const [search, setSearch] = useState('')

  const filtered = songs.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <input
        type="text"
        placeholder="Search songs…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="p-2 m-2 rounded border border-app-600 bg-app-900 text-white"
      />
      <div className="flex-1 overflow-y-auto">
        {filtered.map((song) => (
          <div
            key={song.id}
            onClick={() => loadSong(song.id)}
            className={`py-2.5 px-3 cursor-pointer border-b border-app-700 text-white ${presentationState?.activeSongId === song.id ? 'bg-accent-song' : 'bg-transparent'}`}
          >
            <div className="font-medium">{song.title}</div>
            {song.mood.length > 0 && (
              <div className="text-[11px] text-app-300 mt-0.5">
                {song.mood.join(', ')}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-3 text-app-400 text-center">
            No songs found
          </div>
        )}
      </div>
    </div>
  )
}
