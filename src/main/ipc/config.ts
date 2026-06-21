import { ipcMain, BrowserWindow } from 'electron'
import type { AppConfigLibrary } from '../store/AppConfigLibrary'
import type { AppConfig } from '../../shared/models/AppConfig'
import { IPC } from '../../shared/ipc/channels'

export function registerConfigHandlers(appConfigLibrary: AppConfigLibrary, dataDir: string): void {
  ipcMain.handle(IPC.CONFIG_GET, () => appConfigLibrary.get())

  ipcMain.handle(IPC.CONFIG_SAVE, (_event, partial: Partial<AppConfig>) => {
    const merged: AppConfig = { ...appConfigLibrary.get(), ...partial }
    appConfigLibrary.save(dataDir, merged)
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send(IPC.CONFIG_CHANGED, merged)
    })
  })

  ipcMain.handle(IPC.APP_GET_PATHS, () => ({ dataDir }))
}
