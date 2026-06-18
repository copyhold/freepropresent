import { BrowserWindow, screen } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'

let controlWindow: BrowserWindow | null = null
const outputWindows: BrowserWindow[] = []

function getPreloadPath(name: string): string {
  return join(__dirname, `../preload/${name}.js`)
}

function getRendererUrl(name: string): string {
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    return `${process.env['ELECTRON_RENDERER_URL']}/${name}/index.html`
  }
  return join(__dirname, `../renderer/${name}/index.html`)
}

export function createWindows(): { control: BrowserWindow; outputs: BrowserWindow[] } {
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()

  // Control window on primary display
  controlWindow = new BrowserWindow({
    x: primary.bounds.x,
    y: primary.bounds.y,
    width: 1200,
    height: 800,
    webPreferences: {
      preload: getPreloadPath('index'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    controlWindow.webContents.openDevTools({ mode: 'detach' })
    controlWindow.loadURL(getRendererUrl('control'))
  } else {
    controlWindow.loadFile(getRendererUrl('control'))
  }

  // Output windows on secondary displays (or primary in dev single-monitor)
  const outputDisplays = displays.length > 1 ? displays.filter((d) => d.id !== primary.id) : [primary]

  for (const display of outputDisplays.slice(0, 2)) {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      fullscreen: !isDev && displays.length > 1,
      frame: false,
      alwaysOnTop: !isDev && displays.length > 1,
      backgroundColor: '#000000',
      webPreferences: {
        preload: getPreloadPath('index'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    if (isDev) {
      win.loadURL(getRendererUrl('output'))
    } else {
      win.loadFile(getRendererUrl('output'))
    }

    outputWindows.push(win)
  }

  return { control: controlWindow, outputs: outputWindows }
}

export function getControlWindow(): BrowserWindow | null {
  return controlWindow
}

export function getOutputWindows(): BrowserWindow[] {
  return outputWindows
}
