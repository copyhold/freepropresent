import { ipcMain, screen } from 'electron'
import { IPC } from '../../shared/ipc/channels'
import type { PresentationStore } from '../store/PresentationStore'

export function registerPresentationHandlers(store: PresentationStore): void {
  ipcMain.handle(IPC.PRESENT_LOAD_SONG, (_e, args: { songId: string; templateId?: string }) =>
    store.loadSong(args.songId, args.templateId)
  )
  ipcMain.handle(IPC.PRESENT_GOTO_SLIDE, (_e, index: number) => store.gotoSlide(index))
  ipcMain.handle(IPC.PRESENT_NEXT_SLIDE, () => store.nextSlide())
  ipcMain.handle(IPC.PRESENT_PREV_SLIDE, () => store.prevSlide())
  ipcMain.handle(IPC.PRESENT_SET_MODE, (_e, mode: 'live' | 'blank' | 'logo') => store.setMode(mode))
  ipcMain.handle(IPC.PRESENT_SET_TEMPLATE, (_e, templateId: string) => store.setTemplate(templateId))
  ipcMain.handle(IPC.PRESENT_CLEAR, () => store.clear())
  ipcMain.handle(IPC.DISPLAY_LIST, () => screen.getAllDisplays())
}
