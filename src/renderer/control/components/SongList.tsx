import { useState } from "react";
import { useAppStore } from "../store";

export function SongList() {
  const songs = useAppStore((s) => s.songs);
  const selectSong = useAppStore((s) => s.selectSong);
  const selectedSong = useAppStore((s) => s.selectedSong);
  const presentationState = useAppStore((s) => s.presentationState);
  const [search, setSearch] = useState("");

  const mainSongs = songs.filter((s) => !s.isVariant);

  const query = search.toLowerCase().trim();
  const filteredSongs = query
    ? (() => {
        const matchedMainIds = new Set(
          songs
            .filter(
              (s) =>
                s.title.toLowerCase().includes(query) ||
                s.lyrics.toLowerCase().includes(query),
            )
            .map((s) => s.mainSongId ?? s.filePath),
        );
        return mainSongs.filter((s) => matchedMainIds.has(s.filePath));
      })()
    : mainSongs;

  return (
    <div className="flex flex-col h-full">
      <input
        type="text"
        placeholder="Search songs…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="p-2 m-2 rounded border border-app-600 bg-app-900 text-app-100"
      />
      <div className="flex-1 overflow-y-auto">
        {filteredSongs.map((song) => {
            const isActive = presentationState?.activeSongId === song.id;
            const isSelected = selectedSong?.id === song.id;

            return (
              <div
                key={song.id}
                onClick={() => selectSong(song.id)}
                className={`py-2.5 px-3 cursor-pointer border-b border-app-700 text-app-100 ${
                  isActive
                    ? "bg-accent-song"
                    : isSelected
                      ? "bg-app-800"
                      : "bg-transparent"
                }`}
              >
                <div className="font-medium">{song.title}</div>
                {song.mood.length > 0 && (
                  <div className="text-[11px] text-app-300 mt-0.5">
                    {song.mood.join(", ")}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
