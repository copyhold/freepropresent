import { create } from 'zustand'
import type { CompiledSong } from '@shared/models/Song'
import type { Template } from '@shared/models/Template'
import type { PresentationState } from '@shared/models/Presentation'
import { IPC } from '@shared/ipc/channels'
import type { SectionType } from '@shared/models/Song'

interface AppState {
  songs: CompiledSong[]
  templates: Template[]
  presentationState: PresentationState | null
  activeSong: CompiledSong | null

  loadLibrary: () => Promise<void>
  loadSong: (id: string, templateId?: string) => Promise<void>
  nextSlide: () => Promise<void>
  prevSlide: () => Promise<void>
  gotoSlide: (index: number) => Promise<void>
  gotoSection: (key: string) => void
  setMode: (mode: 'live' | 'blank' | 'logo') => Promise<void>
  setTemplate: (templateId: string) => Promise<void>
  setPresentationState: (state: PresentationState) => void
  reloadLibrary: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  songs: [],
  templates: [],
  presentationState: null,
  activeSong: null,

  loadLibrary: async () => {
    const [songs, templates] = await Promise.all([
      window.electronAPI.invoke!(IPC.SONGS_LIST) as Promise<CompiledSong[]>,
      window.electronAPI.invoke!(IPC.TEMPLATES_LIST) as Promise<Template[]>
    ])
    set({ songs, templates })
  },

  reloadLibrary: async () => {
    await window.electronAPI.invoke!(IPC.SONGS_RELOAD)
    const songs = (await window.electronAPI.invoke!(IPC.SONGS_LIST)) as CompiledSong[]
    set({ songs })
  },

  loadSong: async (id: string, templateId?: string) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_LOAD_SONG, {
      songId: id,
      templateId
    })) as PresentationState
    const songs = get().songs
    const activeSong = songs.find((s) => s.id === id) ?? null
    set({ presentationState: state, activeSong })
  },

  nextSlide: async () => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_NEXT_SLIDE)) as PresentationState
    set({ presentationState: state })
  },

  prevSlide: async () => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_PREV_SLIDE)) as PresentationState
    set({ presentationState: state })
  },

  gotoSlide: async (index: number) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_GOTO_SLIDE, index)) as PresentationState
    set({ presentationState: state })
  },

  gotoSection: (key: string) => {
    const { activeSong } = get()
    if (!activeSong) return

    const typeMap: Partial<Record<string, SectionType>> = { c: 'chorus', b: 'bridge' }
    const digit = parseInt(key, 10)

    let targetSection
    if (!isNaN(digit) && digit > 0) {
      targetSection = activeSong.sections.find((s) => s.type === 'verse' && s.number === digit)
    } else {
      const t = typeMap[key.toLowerCase()]
      if (t) targetSection = activeSong.sections.find((s) => s.type === t)
    }

    if (!targetSection) return

    let flatIndex = 0
    for (const sec of activeSong.sections) {
      if (sec === targetSection) break
      flatIndex += sec.slides.length
    }

    get().gotoSlide(flatIndex)
  },

  setMode: async (mode) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_SET_MODE, mode)) as PresentationState
    set({ presentationState: state })
  },

  setTemplate: async (templateId: string) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_SET_TEMPLATE, templateId)) as PresentationState
    set({ presentationState: state })
  },

  setPresentationState: (state: PresentationState) => {
    const { songs } = get()
    const activeSong = state.activeSongId ? (songs.find((s) => s.id === state.activeSongId) ?? null) : null
    set({ presentationState: state, activeSong })
  }
}))
