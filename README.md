# Propresent

A minimalist lyrics presentation app for worship teams that need to display songs on a projector — including simultaneously in more than one language.

---

## The problem

Worship software is usually bloated. Teams end up maintaining a sprawling database of songs inside a proprietary format, fighting a slow UI, and wrestling with clunky multilingual support that treats translations as afterthoughts. When a team regularly presents songs in Hebrew and English at the same time — or rotates between Russian, Spanish, and the original — that friction compounds every service.

---

## The solution

Propresent manages songs as plain Markdown files. There is no database, no import/export, no sync service. A song is a `.md` file with a small YAML header and sections delimited by `[Verse 1]`, `[Chorus]`, `[Bridge]`, and so on. You edit songs in any text editor. You version-control them with git. You can search them with `grep`. The app watches the folder and picks up changes automatically.

### Multilingual by design

Each language lives in its own file. The primary song file declares its translations:

```markdown
Title: Amazing Grace
Mood: worship, classic
Template: two-language
Variants:
  - he: amazing-grace.he.md
---

[Verse 1]
Amazing grace, how sweet the sound
That saved a wretch like me
```

```markdown
Title: חסד נפלא
---

[Verse 1]
חסד נפלא, כמה מתוק הצליל
שהציל אומלל כמוני
```

The compiler merges the variants into a single compiled song where every slide carries lines keyed by language code. Templates then decide how those languages are laid out on screen — one language full-screen, two languages stacked, a small translation subtitle — all without touching the lyric files.

### Templates, not spreadsheets

A template is a JSON file that describes the slide background and a set of positioned text parts. Each part has a `role` (`primary`, `translation`, `section-label`, `copyright`) and optionally a `languageCode`. The operator selects a template per song from the control window; the output window re-renders instantly. Swapping from a Hebrew-only layout to a bilingual layout is a single click.

---

## How it works

Propresent is an Electron desktop app with two windows:

- **Control window** — song library, slide navigator, template selector, and a live preview of what the projector shows. This is what the operator sees.
- **Output window** — the clean display intended for a secondary screen or projector. It shows nothing but the current slide.

The main process owns all state. When the operator advances a slide, the main process broadcasts the new presentation state to both windows over IPC, keeping them perfectly in sync.

---

## Song file format

```
Title: Song Title
Mood: worship, contemporary
Template: default, two-language
Language: en
Copyright: © 2024 Author Name
Variants:
  - he: song-title.he.md
  - ru: song-title.ru.md

---

[Verse 1]
Line one of the first slide
Line two of the first slide

Line one of the second slide
Line two of the second slide

[Chorus]
Chorus line one
Chorus line two

[Bridge]
Bridge text here
```

- Each blank line between lyric lines starts a new slide within the section.
- The YAML header ends at the first `---` separator line.
- Supported section types: `Verse`, `Chorus`, `Bridge`, `Pre-Chorus`, `Intro`, `Outro`, or any custom label.
- Language files are plain song files with no `Variants` field; they are referenced from the primary file.

---

## Getting started

Download the windows release from [releases](https://github.com/copyhold/propresent/releases) page, or run it from the source code.

```bash
npm install
npm run dev        # development with hot reload
npm run build      # production build
npm run typecheck  # type-check all configs
```

Songs go in `data/songs/`. Templates go in `data/templates/`. Point the app at any folder via `data/app.config.json`.

---

## Custom CSS

Settings → Custom CSS lets you inject styles into either window. Each window exposes semantic classes you can target.

### Control window selectors

| Selector | Element |
|---|---|
| `.ctrl-root` | Root grid (the whole control window) |
| `.ctrl-col-songs` | Song list column |
| `.ctrl-col-detail` | Song detail column |
| `.ctrl-col-pane` | Presentation pane column |
| `.ctrl-pane-toolbar` | Fade Out / Fade In / End button bar |
| `.ctrl-pane-templates` | Template selector strip |
| `.ctrl-pane-slides` | Slide navigator area |
| `.ctrl-pane-preview` | Bottom preview + slide info |

### Presentation window selectors

**Slide container** — present on every live slide:

| Selector | When |
|---|---|
| `.slide-root` | every live slide |
| `.slide-verse` | verse section |
| `.slide-chorus` | chorus section |
| `.slide-bridge` | bridge section |
| `.slide-pre-chorus` | pre-chorus section |
| `.slide-intro` | intro section |
| `.slide-outro` | outro section |
| `.slide-custom` | custom-typed section |

**Part divs** — one per template part:

| Selector | When |
|---|---|
| `.slide-part` | every part |
| `.slide-part-primary` | main lyrics |
| `.slide-part-translation` | translation text |
| `.slide-part-title` | song title |
| `.slide-part-copyright` | copyright line |
| `.slide-part-section-label` | section label |
| `.slide-part-custom` | static custom text |
| `.lang-en`, `.lang-he`, `.lang-ar` … | any part with a language code |

Example: `.slide-chorus .slide-part-primary { color: gold; }` or `.lang-he { direction: rtl; }`.

---

## Stack

Electron 31 · React 18 · TypeScript 5 · Vite (electron-vite) · Tailwind CSS 4 · Zustand · Zod · chokidar
