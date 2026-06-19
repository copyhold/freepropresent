import type { PresentationState, OutputRenderPayload, LibraryChangedEvent } from '../shared/models/Presentation'

declare global {
  interface Window {
    electronAPI: {
      invoke?: (channel: string, ...args: unknown[]) => Promise<unknown>
      openFile?: (filePath: string) => Promise<string>
      onPresentationStateChanged?: (cb: (state: PresentationState) => void) => () => void
      onLibraryChanged?: (cb: (event: LibraryChangedEvent) => void) => () => void
      onOutputRender?: (cb: (payload: OutputRenderPayload) => void) => () => void
      onRender?: (cb: (payload: OutputRenderPayload) => void) => () => void
    }
  }
}

export {}
