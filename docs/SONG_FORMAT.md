# Song File Format

Songs are plain Markdown files. The app reads them from a configurable songs folder and never writes to them.

---

## Main Song File

```
Title: Song about flowers
Mood: sad,happy
Template: HappyTemplate,default
Language: en
Variants:
 - ru: songflowers.ru.md
 - de: songflowers.de.md
 - translit-ru: transliterations/flowerssong.ru.md

---

[Verse 1]
Amazing grace, how sweet the sound
That saved a wretch like me

I once was lost but now am found
Was blind but now I see

[Chorus]
How precious did that grace appear
The hour I first believed

[Verse 2]
...
```

### Header Fields

| Field | Required | Description |
|---|---|---|
| `Title` | Yes | Song title (primary language) |
| `Mood` | No | Comma-separated mood tags |
| `Template` | No | Comma-separated recommended template names; shown as quick-select buttons in the control UI |
| `Language` | No | BCP-47 language code of the primary content (e.g. `en`, `he`). Defaults to `primary` if absent. |
| `Variants` | **Required** | List of `langCode: relative/path.md` pairs; use an empty value when there are no variants |

> **Note:** The `Variants:` field must be present in every main/standalone song file, even when no translations exist. Its presence is how the app distinguishes main songs from translation files. Variant files must never include a `Variants:` field.

**Standalone song (no translations):**

```
Title: Song with no variants
Variants:

---

[Verse 1]
Line one
Line two
```

### Header Separator

The header ends at the first line that is `---` or any sequence of 3+ dashes (e.g. `----------`).

### Content Structure

**Sections** are marked with `[Section Name]` on its own line. The bracket notation is the identifier — section names can be anything: `[Verse 1]`, `[Chorus]`, `[Bridge]`, `[Intro]`, `[Outro]`, `[Pre-Chorus]`, etc.

**Slides** within a section are separated by blank lines. Each group of consecutive non-empty lines is one slide.

```
[Verse 1]
Line 1 of slide 1        ← slide 1
Line 2 of slide 1

Line 1 of slide 2        ← slide 2
Line 2 of slide 2

[Chorus]
Chorus line 1            ← slide 1 of chorus
Chorus line 2
```

Lines before the first section marker are ignored (can be used for comments).

### Section Types and Keyboard Shortcuts

The parser derives a `type` and optional `number` from the section name. These drive keyboard navigation in the control window — no extra markup needed in the file.

| Section name pattern | `type` | `number` | Keyboard shortcut |
|---|---|---|---|
| `[Verse]`, `[Verse 1]`, `[Verse 2]` … | `verse` | `1`, `2` … (1 if absent) | `1`, `2`, `3` … |
| `[Chorus]` | `chorus` | — | `c` |
| `[Bridge]` | `bridge` | — | `b` |
| `[Pre-Chorus]`, `[Pre Chorus]` | `pre-chorus` | — | *(no default shortcut)* |
| `[Intro]` | `intro` | — | *(no default shortcut)* |
| `[Outro]` | `outro` | — | *(no default shortcut)* |
| Anything else | `custom` | — | *(no default shortcut)* |

Matching is **case-insensitive**. `[CHORUS]`, `[Chorus]`, and `[chorus]` all resolve to `type: 'chorus'`.

Pressing `1` jumps to the **first slide** of the first section with `type: 'verse', number: 1`. If the song has no Verse 1, the key does nothing.

---

## Variant File

A variant file provides the same song content in a different language or form (e.g. transliteration).

```
Title: Песня о цветах

---

[Verse 1]
Удивительная благодать, как сладок этот звук
Что спас такого грешника, как я

Я был потерян, но теперь нашёлся
Был слеп, но ныне вижу

[Chorus]
Как драгоценна эта благодать
В час, когда я впервые уверовал
```

### Variant Header Fields

| Field | Required | Description |
|---|---|---|
| `Title` | No | Translated song title |
| `Language` | No | BCP-47 language code (informational) |

All other header fields are ignored in variant files — they are controlled by the main file.

### Section Matching

Variant sections are matched to main file sections **by name** (case-insensitive). Slides are matched **by index** within each section.

- If a variant has fewer slides than the main file: missing slides get empty content (the template part is hidden if `hideWhenEmpty: true`).
- If a variant has more slides than the main file: extra slides are ignored.
- If a variant has a section the main file doesn't have: it is ignored.
- If the main file has a section the variant doesn't have: all slides in that section get empty content for that language.

---

## File Naming Conventions (recommended, not enforced)

| File | Convention |
|---|---|
| Main song | `songname.md` |
| Language variant | `songname.ru.md` |
| Transliteration variant | `songname.translit-ru.md` or `transliterations/songname.ru.md` |

Variant paths in the `Variants:` field are **relative to the main song file's directory**.

---

## Example: Song with Hebrew and Transliteration

`songs/amazing-grace.md`:
```
Title: Amazing Grace
Template: TwoLanguage,Transliteration
Variants:
 - he: amazing-grace.he.md
 - translit-he: amazing-grace.translit-he.md

---

[Verse 1]
Amazing grace, how sweet the sound
That saved a wretch like me
```

`songs/amazing-grace.he.md`:
```
Title: חסד נפלא

---

[Verse 1]
חסד נפלא, כמה מתוק הצליל
שהציל אומלל כמוני
```

`songs/amazing-grace.translit-he.md`:
```
Title: Hesed Nifla

---

[Verse 1]
Hesed nifla, kama matok ha-tzlil
She-hitzil omlelal kamoni
```

A template using all three would define three `TemplatePart` entries:
- `role: 'primary'` → English lines
- `role: 'translation', languageCode: 'he'` → Hebrew lines (rendered RTL)
- `role: 'translation', languageCode: 'translit-he'` → Transliteration lines
