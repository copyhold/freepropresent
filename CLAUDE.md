# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with auto-reload
npm run dev:debug    # Dev with Chromium DevTools inspector
npm run build        # Build production application
npm run preview      # Preview production build
npm run typecheck    # Type-check all tsconfig files
```

## Architecture

Propresent is a lyrics presentation **Electron** desktop app. It has two windows:
- **Control window** — song management and slide navigation (operator-facing)
- **Output window** — clean display rendered on a secondary/projector screen

Stack: Electron 31 · React 18 · TypeScript 5 · Vite (electron-vite) · Tailwind CSS 4 · Zustand · Zod · chokidar

### Process split

```
src/
├── main/           # Node/Electron main process
│   ├── index.ts          — app init, store wiring
│   ├── windows.ts        — window creation (control + output)
│   ├── ipc/              — IPC handlers per domain (songs, templates, presentation)
│   ├── parser/           — song markdown parser & compiler
│   └── store/            — Songs, Templates, Config, PresentationStore
│
├── preload/        # Context-bridge scripts (exposes `window.electronAPI`)
│   ├── index.ts / control.ts / output.ts
│
├── renderer/       # React frontends (two separate entry points)
│   ├── control/    — song list, slide navigator, template selector, preview
│   ├── output/     — audience-facing display only
│   ├── shared/     — SlideRenderer, SlidePart, Background (used in both windows)
│   └── global.css  — Tailwind theme (dark app-* scale + accent colors)
│
└── shared/         # Cross-process types & constants
    ├── models/     — Song, Template, Presentation, AppConfig interfaces
    └── ipc/channels.ts  — IPC channel name constants
```

### Key data models (`src/shared/models/`)

- **CompiledSong** → sections → **CompiledSlide** · `lines: Record<language, string[]>`
- **Template** → `background` (color/gradient/image/video) + `parts[]` with geometry & text style
- **PresentationState** — current song/section/slide index, broadcast to all windows on change
- Songs are stored as Markdown files with a YAML header (`Title`, `Mood`, `Template`, `Variants`)

### State management

- **Main process**: plain store classes (`PresentationStore` broadcasts state via IPC to all renderer windows on every change)
- **Renderer**: Zustand stores (`src/renderer/control/store/`)

### IPC pattern

IPC channel names live in `src/shared/ipc/channels.ts`. Main handlers are in `src/main/ipc/`. The preload scripts expose a typed `electronAPI` object to renderers via `contextBridge`.

### Build config

`electron.vite.config.ts` defines three Vite sub-configs (main, preload, renderer). The renderer has two HTML entry points (control + output). **Never use `@` path aliases** — always use relative imports (e.g. `../../shared/models/Foo`).

## Layout conventions

Prefer CSS Grid over Flexbox for UI layouts; use Flex only when Grid is genuinely unsuitable.
