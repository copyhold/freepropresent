import { BrowserWindow } from 'electron'
import type { PresentationState, OutputRenderPayload, ResolvedSlide } from '../../shared/models/Presentation'
import { IPC } from '../../shared/ipc/channels'
import type { SongLibrary } from './SongLibrary'
import type { TemplateLibrary } from './TemplateLibrary'
import type { AppConfigLibrary } from './AppConfigLibrary'

const DEFAULT_TEMPLATE_ID = 'default'

function makeInitialState(): PresentationState {
  return {
    activeSongId: null,
    currentSlideIndex: 0,
    templateId: DEFAULT_TEMPLATE_ID,
    outputMode: 'blank',
    output2Mode: 'off',
    totalSlides: 0
  }
}

export class PresentationStore {
  private state: PresentationState = makeInitialState()

  constructor(
    private songs: SongLibrary,
    private templates: TemplateLibrary,
    private appConfigLib: AppConfigLibrary
  ) {}

  getState(): PresentationState {
    return { ...this.state }
  }

  loadSong(songId: string, templateId?: string): PresentationState {
    const song = this.songs.get(songId)
    if (!song) return this.state

    const totalSlides = song.sections.reduce((sum, s) => sum + s.slides.length, 0)

    this.state = {
      ...this.state,
      activeSongId: songId,
      currentSlideIndex: 0,
      templateId: templateId ?? this.state.templateId,
      outputMode: 'live',
      totalSlides,
      songTitle: song.title
    }

    this.broadcast()
    return this.getState()
  }

  gotoSlide(index: number): PresentationState {
    const total = this.state.totalSlides
    if (total === 0) return this.state

    const clamped = Math.max(0, Math.min(index, total - 1))
    this.state = { ...this.state, currentSlideIndex: clamped, outputMode: 'live' }
    this.broadcast()
    return this.getState()
  }

  nextSlide(): PresentationState {
    return this.gotoSlide(this.state.currentSlideIndex + 1)
  }

  prevSlide(): PresentationState {
    return this.gotoSlide(this.state.currentSlideIndex - 1)
  }

  setMode(mode: 'live' | 'blank' | 'logo'): PresentationState {
    this.state = { ...this.state, outputMode: mode }
    this.broadcast()
    return this.getState()
  }

  setTemplate(templateId: string): PresentationState {
    this.state = { ...this.state, templateId }
    this.broadcast()
    return this.getState()
  }

  clear(): PresentationState {
    this.state = makeInitialState()
    this.broadcast()
    return this.getState()
  }

  private resolveCurrentSlide(): ResolvedSlide | null {
    const { activeSongId, currentSlideIndex } = this.state
    if (!activeSongId) return null

    const song = this.songs.get(activeSongId)
    if (!song) return null

    let flat = 0
    for (const section of song.sections) {
      for (let i = 0; i < section.slides.length; i++) {
        if (flat === currentSlideIndex) {
          return {
            slide: section.slides[i],
            sectionName: section.name,
            sectionType: section.type,
            slideIndexInSection: i
          }
        }
        flat++
      }
    }

    return null
  }

  broadcast(): void {
    const { activeSongId, templateId } = this.state
    const template =
      this.templates.get(templateId) ?? this.templates.getDefault()

    if (!template) return

    const song = activeSongId ? this.songs.get(activeSongId) : null
    const resolvedSlide = this.resolveCurrentSlide()

    const payload: OutputRenderPayload = {
      state: this.getState(),
      slide: resolvedSlide,
      template,
      songTitle: song?.title ?? '',
      songCopyright: song?.copyright,
      appConfig: this.appConfigLib.get()
    }

    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.OUTPUT_RENDER, payload)
      win.webContents.send(IPC.PRESENT_STATE_CHANGED, this.getState())
    }
  }
}
