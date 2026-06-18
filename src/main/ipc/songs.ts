import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc/channels'
import type { SongLibrary } from '../store/SongLibrary'

export function registerSongHandlers(library: SongLibrary): void {
  ipcMain.handle(IPC.SONGS_LIST, () => library.getAll())
  ipcMain.handle(IPC.SONGS_GET, (_e, id: string) => library.get(id) ?? null)
  ipcMain.handle(IPC.SONGS_RELOAD, () => { library.reload() })
}
