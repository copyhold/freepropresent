# Settings Screen Design

**Date:** 2026-06-21  
**Scope:** UI controls only — theme selector, custom CSS textareas, data folder opener. No theme application or CSS injection.

---

## Overview

A settings modal overlaid on the control window, triggered via a native Electron app menu item ("Preferences…", `CmdOrCtrl+,`). Settings are persisted to `app.config.json` on Save.

---

## Data Layer

### `src/shared/models/AppConfig.ts`

Add three optional fields:

```ts
theme: 'dark' | 'light' | 'system' - default 'system'
controlCss?: string
presentationCss?: string
```

### `src/main/store/AppConfigLibrary.ts`

Add a `save(dataDir: string, config: AppConfig): void` method that writes the config object to `app.config.json` using `writeFileSync`.

---

## IPC

### `src/shared/ipc/channels.ts`

Four new channels:

| Key | Value | Direction |
|-----|-------|-----------|
| `CONFIG_GET` | `'config:get'` | renderer → main (invoke) |
| `CONFIG_SAVE` | `'config:save'` | renderer → main (invoke) |
| `SHELL_OPEN_FOLDER` | `'shell:openFolder'` | renderer → main (invoke) |
| `SETTINGS_OPEN` | `'settings:open'` | main → renderer (send) |

### `src/main/ipc/config.ts` (new file)

Registers two handlers:

- `CONFIG_GET` — returns `appConfigLibrary.get()`
- `CONFIG_SAVE` — merges payload into existing config, calls `appConfigLibrary.save(dataDir, merged)`

Registration signature: `registerConfigHandlers(appConfigLibrary, dataDir)`.

### `src/main/ipc/shell.ts`

Add handler for `SHELL_OPEN_FOLDER` that calls `shell.openPath(dataDir)`. No path argument from renderer — `dataDir` is closed over at registration time.

Registration signature changes to: `registerShellHandlers(dataDir)`.

### `src/main/ipc/index.ts`

`registerAllHandlers` accepts `dataDir` and forwards it to config and shell registrations.

### `src/main/index.ts`

- Build native `Menu` with a "Preferences…" item (`CmdOrCtrl+,`) before calling `createWindows()`.
- Click handler: `getControlWindow()?.webContents.send(IPC.SETTINGS_OPEN)`.
- Pass `dataDir` to `registerAllHandlers`.

Also register an `ipcMain.handle` for `APP_GET_PATHS` that returns `{ dataDir }`.

---

## Preload

### `src/preload/control.ts`

Add to the `electronAPI` context bridge:

```ts
getConfig: () => ipcRenderer.invoke(IPC.CONFIG_GET)
saveConfig: (config) => ipcRenderer.invoke(IPC.CONFIG_SAVE, config)
openDataFolder: () => ipcRenderer.invoke(IPC.SHELL_OPEN_FOLDER)
getAppPaths: () => ipcRenderer.invoke(IPC.APP_GET_PATHS)
onSettingsOpen: (cb) => {
  const handler = () => cb()
  ipcRenderer.on(IPC.SETTINGS_OPEN, handler)
  return () => ipcRenderer.off(IPC.SETTINGS_OPEN, handler)
}
```

---

## Renderer

### `src/renderer/control/App.tsx`

- Add `const [settingsOpen, setSettingsOpen] = useState(false)`.
- In the existing `useEffect`, subscribe to `window.electronAPI.onSettingsOpen(() => setSettingsOpen(true))` and return the unsubscribe.
- Render `{settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}` after the main grid `<div>`.

### `src/renderer/control/components/SettingsModal.tsx` (new file)

**Local state:** `theme`, `controlCss`, `presentationCss`, `dataDir` (string), `loading` (bool).

**On mount:**
1. Call `getConfig()` → populate `theme`, `controlCss`, `presentationCss`.
2. Call `getAppPaths()` → populate `dataDir`.

**Layout** (`fixed inset-0 z-50`):
- Backdrop: `bg-black/60` covers the full screen.
- Card: centered, `w-[540px]`, `bg-app-900 border border-app-700 rounded-lg`, with internal padding and grid rows.

**Sections:**

1. **Header row** — "Settings" title (`text-sm font-semibold`) + ✕ close button (top-right).

2. **Appearance section**
   - Label: "Theme"
   - Segmented control: three buttons side-by-side — `Dark`, `Light`, `System`.
   - Active button: `bg-app-700 text-white border-app-500`; inactive: `bg-app-800 text-app-300 border-app-600`.

3. **Custom CSS section**
   - Two labeled `<textarea>` elements, each ~6 rows tall, monospace font, `bg-app-800 border border-app-600 rounded text-xs text-app-100 p-2 w-full resize-y`.
   - Labels: "Control window CSS" / "Presentation window CSS".

4. **Data folder section**
   - Label: "Data folder"
   - Path display: truncated `text-app-300 text-xs` span.
   - "Open Folder" button: `border border-app-600 bg-app-800 text-xs px-3 py-1 rounded` — calls `openDataFolder()` on click.

5. **Footer row**
   - Right-aligned Cancel + Save buttons.
   - Cancel: `border border-app-600 bg-app-800`.
   - Save: `bg-accent text-white`.
   - Save merges `{ theme, controlCss, presentationCss }` into existing config via `saveConfig`, then calls `onClose`.

**Keyboard:** `Escape` closes the modal (calls `onClose`).

---

## What is NOT implemented

- Applying the selected theme to either window.
- Injecting `controlCss` or `presentationCss` into the respective windows.
- These fields are persisted to `app.config.json` only, ready for future use.
