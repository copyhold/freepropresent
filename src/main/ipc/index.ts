import type { SongLibrary } from '../store/SongLibrary'
import type { TemplateLibrary } from '../store/TemplateLibrary'
import type { PresentationStore } from '../store/PresentationStore'
import type { AppConfigLibrary } from '../store/AppConfigLibrary'
import { registerSongHandlers } from './songs'
import { registerTemplateHandlers } from './templates'
import { registerPresentationHandlers } from './presentation'
import { registerShellHandlers } from './shell'
import { registerConfigHandlers } from './config'

export function registerAllHandlers(
  songs: SongLibrary,
  templates: TemplateLibrary,
  presentation: PresentationStore,
  appConfig: AppConfigLibrary,
  dataDir: string
): void {
  registerSongHandlers(songs)
  registerTemplateHandlers(templates)
  registerPresentationHandlers(presentation)
  registerShellHandlers(dataDir)
  registerConfigHandlers(appConfig, dataDir)
}
