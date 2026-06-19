import type { SlideBackground } from '../../shared/models/Template'

interface Props {
  background: SlideBackground
}

export function Background({ background }: Props) {
  const style: React.CSSProperties = {}

  if (background.type === 'color') {
    style.backgroundColor = background.color ?? '#000'
  } else if (background.type === 'gradient') {
    style.background = background.gradient ?? '#000'
  } else if (background.type === 'image') {
    style.backgroundImage = `url(${background.imageUrl})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
    if (background.opacity !== undefined) {
      style.opacity = background.opacity
    }
  }

  return <div className="absolute inset-0" style={style} />
}
