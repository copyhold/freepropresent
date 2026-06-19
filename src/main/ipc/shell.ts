import { ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc/channels'

export function registerShellHandlers(): void {
  ipcMain.handle(IPC.SHELL_OPEN_FILE, (_event, filePath: string) => shell.openPath(filePath))
}
