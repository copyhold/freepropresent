import type { CompiledSlide, SectionType } from './Song'
import type { Template } from './Template'
import type { AppConfig } from './AppConfig'

export interface PresentationState {
  activeSongId: string | null
  currentSlideIndex: number
  templateId: string
  outputMode: 'live' | 'blank' | 'logo'
  output2Mode: 'mirror' | 'custom' | 'off'
  output2TemplateId?: string
  songTitle?: string
  totalSlides: number
  currentSectionName?: string
}

export interface ResolvedSlide {
  slide: CompiledSlide
  sectionName: string
  sectionType: SectionType
  slideIndexInSection: number
}

export interface OutputRenderPayload {
  state: PresentationState
  slide: ResolvedSlide | null
  template: Template
  songTitle: string
  songCopyright?: string
  appConfig: AppConfig
}

export interface LibraryChangedEvent {
  type: 'song' | 'template'
  id: string
  action: 'added' | 'changed' | 'removed'
}
