import { contextBridge, ipcRenderer } from 'electron'
import type { PresentationState, OutputRenderPayload, LibraryChangedEvent } from '../shared/models/Presentation'
import { IPC } from '../shared/ipc/channels'

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),

  openFile: (filePath: string) => ipcRenderer.invoke(IPC.SHELL_OPEN_FILE, filePath),

  onRender: (cb: (payload: OutputRenderPayload) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: OutputRenderPayload) => cb(payload)
    ipcRenderer.on(IPC.OUTPUT_RENDER, handler)
    return () => ipcRenderer.off(IPC.OUTPUT_RENDER, handler)
  },

  onPresentationStateChanged: (cb: (state: PresentationState) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, state: PresentationState) => cb(state)
    ipcRenderer.on(IPC.PRESENT_STATE_CHANGED, handler)
    return () => ipcRenderer.off(IPC.PRESENT_STATE_CHANGED, handler)
  },

  onLibraryChanged: (cb: (event: LibraryChangedEvent) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, event: LibraryChangedEvent) => cb(event)
    ipcRenderer.on(IPC.LIBRARY_CHANGED, handler)
    return () => ipcRenderer.off(IPC.LIBRARY_CHANGED, handler)
  },

  onOutputRender: (cb: (payload: OutputRenderPayload) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: OutputRenderPayload) => cb(payload)
    ipcRenderer.on(IPC.OUTPUT_RENDER, handler)
    return () => ipcRenderer.off(IPC.OUTPUT_RENDER, handler)
  }
})
