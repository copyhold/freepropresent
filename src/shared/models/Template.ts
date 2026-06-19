export type PartRole = 'primary' | 'translation' | 'title' | 'copyright' | 'section-label' | 'custom'

export interface TextStyle {
  fontFamily?: string
  fontSize?: number
  minFontSize?: number
  maxFontSize?: number
  fontWeight?: 'normal' | 'bold' | number
  fontStyle?: 'normal' | 'italic'
  color?: string
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number
  textShadow?: string
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}

export interface PartGeometry {
  left: number
  top: number
  width: number
  height: number
}

export interface TemplatePart {
  id: string
  role: PartRole
  languageCode?: string
  staticText?: string
  geometry: PartGeometry
  style: TextStyle
  verticalAlign?: 'top' | 'middle' | 'bottom'
  hideWhenEmpty?: boolean
}

export interface SlideBackground {
  type: 'color' | 'gradient' | 'image' | 'video'
  color?: string
  gradient?: string
  imageUrl?: string
  videoUrl?: string
  opacity?: number
}

export interface Template {
  id: string
  name: string
  description?: string
  designResolution?: { width: number; height: number }
  minFontSize?: number
  maxFontSize?: number
  background: SlideBackground
  parts: TemplatePart[]
  sectionOverrides?: Partial<Record<string, Partial<TemplatePart>[]>>
}
