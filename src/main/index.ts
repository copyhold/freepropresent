import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { createWindows } from './windows'

const isDev = process.env.NODE_ENV === 'development'
import { SongLibrary } from './store/SongLibrary'
import { TemplateLibrary } from './store/TemplateLibrary'
import { AppConfigLibrary } from './store/AppConfigLibrary'
import { PresentationStore } from './store/PresentationStore'
import { registerAllHandlers } from './ipc/index'

const songLibrary = new SongLibrary()
const templateLibrary = new TemplateLibrary()
const appConfigLibrary = new AppConfigLibrary()
let presentationStore: PresentationStore

function getDataDir(): string {
  if (isDev) {
    return join(process.cwd(), 'data')
  }
  return join(app.getPath('userData'), 'data')
}

app.whenReady().then(async () => {
  const dataDir = getDataDir()
  const songsDir = join(dataDir, 'songs')
  const templatesDir = join(dataDir, 'templates')

  mkdirSync(songsDir, { recursive: true })
  mkdirSync(templatesDir, { recursive: true })

  appConfigLibrary.load(dataDir)
  templateLibrary.load(templatesDir)

  const extraFolders = appConfigLibrary.get().songFolders ?? []
  await songLibrary.load([songsDir, ...extraFolders])

  presentationStore = new PresentationStore(songLibrary, templateLibrary, appConfigLibrary)

  registerAllHandlers(songLibrary, templateLibrary, presentationStore)

  createWindows()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  songLibrary.close()
})
