import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc/channels'
import type { TemplateLibrary } from '../store/TemplateLibrary'

export function registerTemplateHandlers(library: TemplateLibrary): void {
  ipcMain.handle(IPC.TEMPLATES_LIST, () => library.getAll())
  ipcMain.handle(IPC.TEMPLATES_GET, (_e, id: string) => library.get(id) ?? null)
}
