export interface AppConfig {
  minFontSize?: number
  maxFontSize?: number
  songFolders?: string[]
  theme: 'dark' | 'light' | 'system'
  controlCss?: string
  presentationCss?: string
}
