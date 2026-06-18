import { contextBridge, ipcRenderer } from 'electron'
import type { OutputRenderPayload } from '../shared/models/Presentation'
import { IPC } from '../shared/ipc/channels'

contextBridge.exposeInMainWorld('electronAPI', {
  onRender: (cb: (payload: OutputRenderPayload) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: OutputRenderPayload) => cb(payload)
    ipcRenderer.on(IPC.OUTPUT_RENDER, handler)
    return () => ipcRenderer.off(IPC.OUTPUT_RENDER, handler)
  }
})
