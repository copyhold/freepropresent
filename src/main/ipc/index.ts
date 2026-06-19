import type { SongLibrary } from '../store/SongLibrary'
import type { TemplateLibrary } from '../store/TemplateLibrary'
import type { PresentationStore } from '../store/PresentationStore'
import { registerSongHandlers } from './songs'
import { registerTemplateHandlers } from './templates'
import { registerPresentationHandlers } from './presentation'
import { registerShellHandlers } from './shell'

export function registerAllHandlers(
  songs: SongLibrary,
  templates: TemplateLibrary,
  presentation: PresentationStore
): void {
  registerSongHandlers(songs)
  registerTemplateHandlers(templates)
  registerPresentationHandlers(presentation)
  registerShellHandlers()
}
