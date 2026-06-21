import { app, Menu } from "electron";
import { join } from "path";
import { mkdirSync, readdirSync, cpSync, existsSync } from "fs";
import { createWindows, getControlWindow } from "./windows";

const isDev = process.env.NODE_ENV === "development";
import { SongLibrary } from "./store/SongLibrary";
import { TemplateLibrary } from "./store/TemplateLibrary";
import { AppConfigLibrary } from "./store/AppConfigLibrary";
import { PresentationStore } from "./store/PresentationStore";
import { registerAllHandlers } from "./ipc/index";
import { IPC } from "../shared/ipc/channels";

const songLibrary = new SongLibrary();
const templateLibrary = new TemplateLibrary();
const appConfigLibrary = new AppConfigLibrary();
let presentationStore: PresentationStore;

function getDataDir(): string {
  if (isDev) {
    return join(process.cwd(), "data");
  }
  return join(app.getPath("userData"), "data");
}

function seedDefaultData(songsDir: string, templatesDir: string): void {
  const defaultData = join(process.resourcesPath, "default-data");
  if (!existsSync(defaultData)) return;

  const isEmpty = (dir: string) => readdirSync(dir).length === 0;

  if (isEmpty(songsDir)) {
    const src = join(defaultData, "songs");
    if (existsSync(src)) cpSync(src, songsDir, { recursive: true });
  }

  if (isEmpty(templatesDir)) {
    const src = join(defaultData, "templates");
    if (existsSync(src)) cpSync(src, templatesDir, { recursive: true });
  }
}

app.whenReady().then(async () => {
  const dataDir = getDataDir();
  const songsDir = join(dataDir, "songs");
  console.log("songsDir", songsDir, dataDir);
  const templatesDir = join(dataDir, "templates");

  mkdirSync(songsDir, { recursive: true });
  mkdirSync(templatesDir, { recursive: true });

  if (!isDev) seedDefaultData(songsDir, templatesDir);

  appConfigLibrary.load(dataDir);
  templateLibrary.load(templatesDir);

  const extraFolders = appConfigLibrary.get().songFolders ?? [];
  await songLibrary.load([songsDir, ...extraFolders]);

  presentationStore = new PresentationStore(
    songLibrary,
    templateLibrary,
    appConfigLibrary,
  );

  registerAllHandlers(songLibrary, templateLibrary, presentationStore, appConfigLibrary, dataDir);

  const openSettings = () => getControlWindow()?.webContents.send(IPC.SETTINGS_OPEN)
  const menuTemplate: Electron.MenuItemConstructorOptions[] = process.platform === 'darwin'
    ? [{ label: app.name, submenu: [
        { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: openSettings },
        { type: 'separator' },
        { role: 'quit' }
      ]}]
    : [{ label: 'Edit', submenu: [
        { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: openSettings }
      ]}]
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))

  createWindows();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  songLibrary.close();
});
