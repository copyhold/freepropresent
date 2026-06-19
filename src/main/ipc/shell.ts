import { ipcMain, shell } from 'electron'
import * as path from 'path'
import { IPC } from '../../shared/ipc/channels'

export function registerShellHandlers(): void {
  ipcMain.handle(IPC.SHELL_OPEN_FILE, (_event, filePath: string) => {
    if (typeof filePath !== 'string') return 'error: invalid path'
    const resolved = path.resolve(filePath)
    if (!resolved.endsWith('.md')) return 'error: only .md files can be opened'
    return shell.openPath(resolved)
  })
}
