# Theme & Custom CSS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the persisted `AppConfig` fields (`theme`, `controlCss`, `presentationCss`) so they actually affect the running app — theme only on the control window, CSS injection on both.

**Architecture:** A new `CONFIG_CHANGED` IPC event is broadcast from the main process to all windows after every save. Both renderer windows subscribe and re-apply their concerns: the control window applies a `dark`/`light` class to `<html>` and injects `controlCss`; the output window injects `presentationCss` only. Dark is the default; light overrides CSS variables via an `html.light` selector.

**Tech Stack:** Electron 31, React 18, TypeScript 5, Tailwind CSS 4, Vite (electron-vite)

## Global Constraints

- Never use `@` path aliases — always use relative imports
- CSS Grid over Flexbox for layouts
- `npm run typecheck` must pass after every task
- No test framework exists — verify manually by running `npm run dev`
- Commit after each task

---

### Task 1: IPC plumbing — CONFIG_CHANGED channel

**Files:**
- Modify: `src/shared/ipc/channels.ts`
- Modify: `src/main/ipc/config.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/env.d.ts`

**Interfaces:**
- Produces: `window.electronAPI.onConfigChanged(cb)` — subscribes to config changes, returns unsubscribe fn; called by Tasks 4 and 5

- [ ] **Step 1: Add CONFIG_CHANGED to the IPC channel registry**

In `src/shared/ipc/channels.ts`, add one line inside the `IPC` object:

```ts
export const IPC = {
  // … existing entries …
  CONFIG_CHANGED: 'config:changed',
} as const
```

- [ ] **Step 2: Broadcast CONFIG_CHANGED from the main process after save**

Replace `src/main/ipc/config.ts` entirely:

```ts
import { ipcMain, BrowserWindow } from 'electron'
import type { AppConfigLibrary } from '../store/AppConfigLibrary'
import type { AppConfig } from '../../shared/models/AppConfig'
import { IPC } from '../../shared/ipc/channels'

export function registerConfigHandlers(appConfigLibrary: AppConfigLibrary, dataDir: string): void {
  ipcMain.handle(IPC.CONFIG_GET, () => appConfigLibrary.get())

  ipcMain.handle(IPC.CONFIG_SAVE, (_event, partial: Partial<AppConfig>) => {
    const merged: AppConfig = { ...appConfigLibrary.get(), ...partial }
    appConfigLibrary.save(dataDir, merged)
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send(IPC.CONFIG_CHANGED, merged)
    })
  })

  ipcMain.handle(IPC.APP_GET_PATHS, () => ({ dataDir }))
}
```

- [ ] **Step 3: Expose onConfigChanged in the shared preload**

In `src/preload/index.ts`, add `onConfigChanged` inside the `contextBridge.exposeInMainWorld` object (after the existing `onOutputRender` entry):

```ts
  onConfigChanged: (cb: (config: AppConfig) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, config: AppConfig) => cb(config)
    ipcRenderer.on(IPC.CONFIG_CHANGED, handler)
    return () => ipcRenderer.off(IPC.CONFIG_CHANGED, handler)
  }
```

- [ ] **Step 4: Add onConfigChanged type to env.d.ts**

In `src/renderer/env.d.ts`, add one line inside the `electronAPI` interface (after `onOutputRender`):

```ts
      onConfigChanged?: (cb: (config: AppConfig) => void) => () => void
```

- [ ] **Step 5: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/ipc/channels.ts src/main/ipc/config.ts src/preload/index.ts src/renderer/env.d.ts
git commit -m "feat: broadcast CONFIG_CHANGED to all windows after config save"
```

---

### Task 2: CSS — dark/light theme foundation

**Files:**
- Modify: `src/renderer/global.css`

**Interfaces:**
- Produces: `html.dark` = dark theme (already the visual default); `html.light` = light theme via CSS variable overrides; `dark:` Tailwind utilities enabled for future use

- [ ] **Step 1: Rewrite global.css**

Replace `src/renderer/global.css` entirely:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Dark theme (default — applied when html.dark or no class) */
  --color-app-950: #111;
  --color-app-900: #1a1a1a;
  --color-app-800: #222;
  --color-app-700: #2a2a2a;
  --color-app-600: #444;
  --color-app-500: #555;
  --color-app-400: #666;
  --color-app-300: #888;
  --color-app-200: #aaa;
  --color-app-100: #ccc;
  --color-accent: #4a8fff;
  --color-accent-dark: #1a2a4a;
  --color-accent-song: #2a4a7f;
}

@layer base {
  html, body, #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  html.light {
    --color-app-950: #ffffff;
    --color-app-900: #f5f5f5;
    --color-app-800: #eeeeee;
    --color-app-700: #e0e0e0;
    --color-app-600: #cccccc;
    --color-app-500: #aaaaaa;
    --color-app-400: #888888;
    --color-app-300: #555555;
    --color-app-200: #333333;
    --color-app-100: #111111;
    --color-accent-dark: #dce8ff;
    --color-accent-song: #b8d0ff;
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/global.css
git commit -m "feat: add light theme CSS variable overrides and dark: variant"
```

---

### Task 3: Shared CSS injection utility

**Files:**
- Create: `src/renderer/shared/injectCss.ts`

**Interfaces:**
- Produces: `injectCss(id: string, css: string): void` — finds or creates `<style id="…">` in `<head>` and sets its content; used by Tasks 4 and 5

- [ ] **Step 1: Create injectCss.ts**

Create `src/renderer/shared/injectCss.ts`:

```ts
export function injectCss(id: string, css: string): void {
  let el = document.getElementById(id) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = css
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/shared/injectCss.ts
git commit -m "feat: add shared injectCss utility"
```

---

### Task 4: Control window — apply theme and inject controlCss

**Files:**
- Modify: `src/renderer/control/App.tsx`

**Interfaces:**
- Consumes: `window.electronAPI.getConfig()` (already typed), `window.electronAPI.onConfigChanged(cb)` (Task 1), `injectCss(id, css)` (Task 3)
- Produces: `html.dark` / `html.light` class applied at startup and on every config change or OS scheme change when `theme === 'system'`

- [ ] **Step 1: Add imports to control App.tsx**

At the top of `src/renderer/control/App.tsx`, add two imports after the existing ones:

```ts
import type { AppConfig } from '../../shared/models/AppConfig'
import { injectCss } from '../shared/injectCss'
```

- [ ] **Step 2: Add applyThemeAndCss helper above the App component**

Insert this function above the `export function App()` declaration:

```ts
function applyThemeAndCss(config: AppConfig): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = config.theme === 'dark' || (config.theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.classList.toggle('light', !isDark)
  injectCss('control-custom-css', config.controlCss ?? '')
}
```

- [ ] **Step 3: Add theme useEffect inside App**

Inside `src/renderer/control/App.tsx`, add a new `useEffect` after the existing two `useEffect` calls (the library/state subscription one and the keyboard handler one):

```ts
  useEffect(() => {
    window.electronAPI.getConfig!().then(applyThemeAndCss)

    const unsubConfig = window.electronAPI.onConfigChanged!((config) => {
      applyThemeAndCss(config)
    })

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = () => {
      window.electronAPI.getConfig!().then((config) => {
        if (config.theme === 'system') applyThemeAndCss(config)
      })
    }
    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      unsubConfig()
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [])
```

- [ ] **Step 4: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Manual verification**

```bash
npm run dev
```

1. Open Settings (Cmd+, or menu).
2. Switch theme to **Light** → Save. The control window background should turn white/light gray immediately.
3. Switch theme to **Dark** → Save. Background returns to dark.
4. Switch theme to **System** → Save. Should match your OS appearance.
5. Paste `body { outline: 3px solid red !important; }` in the **Control window** CSS field → Save. A red outline should appear around the window body.
6. Clear the CSS → Save. Outline disappears.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/control/App.tsx
git commit -m "feat: apply theme and controlCss in control window"
```

---

### Task 5: Output window — inject presentationCss

**Files:**
- Modify: `src/renderer/output/App.tsx`

**Interfaces:**
- Consumes: `window.electronAPI.getConfig()` (already typed), `window.electronAPI.onConfigChanged(cb)` (Task 1), `injectCss(id, css)` (Task 3)

- [ ] **Step 1: Add imports to output App.tsx**

At the top of `src/renderer/output/App.tsx`, add after the existing imports:

```ts
import { injectCss } from '../shared/injectCss'
```

- [ ] **Step 2: Add presentationCss injection useEffect**

Inside `src/renderer/output/App.tsx`, add a second `useEffect` after the existing `onRender` one:

```ts
  useEffect(() => {
    window.electronAPI.getConfig!().then((config) => {
      injectCss('presentation-custom-css', config.presentationCss ?? '')
    })

    return window.electronAPI.onConfigChanged!((config) => {
      injectCss('presentation-custom-css', config.presentationCss ?? '')
    })
  }, [])
```

- [ ] **Step 3: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

1. Open Settings. Paste `* { filter: invert(1) !important; }` in the **Presentation window** CSS field → Save.
2. The output window content should invert colours.
3. Clear the field → Save. Output window returns to normal.
4. Confirm the control window is **not** affected by the presentation CSS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/output/App.tsx
git commit -m "feat: inject presentationCss into output window"
```
