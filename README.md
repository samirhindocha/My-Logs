# Handoff: Glucose & Insulin Log Entry (Mobile, Android)

## Overview
A mobile app for logging blood-glucose readings and insulin doses. The core flow is a
thumb-first entry screen: pick a **date**, pick a **time slot** (Fasting, Before Lunch,
After Lunch 2hr, Before Dinner, After Dinner, 3 AM, Custom), enter one **glucose reading**,
and optionally **Morning Units** and **Evening Units** of insulin. Supporting screens are a
**Logbook** (history grouped by day), a **Trends** view (7-day fasting chart + averages),
and a full-screen **save confirmation**.

Target platform in the mock: **Android (Material-ish, 412 × 892 dp viewport)**.

## About the Design Files
The files in this bundle are **design references authored in HTML** — an interactive
prototype demonstrating intended look, layout, and behavior. They are **not production code
to copy**. The task is to **recreate these designs in the target codebase's existing
environment** (React Native, Jetpack Compose, Flutter, SwiftUI, web…) using that codebase's
established components, theming, and navigation patterns. If no environment exists yet,
choose the most appropriate framework and implement there.

`android-frame.jsx` is only a **device bezel used for presentation** (status bar, gesture
nav). Do not port it — the real app runs inside the OS chrome.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and interactions below are final and exact.
Recreate pixel-faithfully using the codebase's own primitives. If the codebase already has a
design system, map these tokens onto it rather than hard-coding hexes — the *values* here are
the source of truth for intent.

---

## Screens / Views

Global shell: content area `412 × 828` (below a 40px status bar, above a 24px gesture nav).
Screen background `#FBF9F4`. All screens are a vertical flex column; only the middle region
scrolls. Bottom navigation floats over the scroll area on Logbook and Trends.

---

### 1. Logbook (default screen)

**Purpose:** review recent readings and doses, jump into a new entry.

**Layout**
- Header: padding `14px 20px 12px`, row, `space-between`, items bottom-aligned.
  - Left: eyebrow "LOGBOOK" (11px / 700 / letter-spacing .14em / uppercase / `#8B9A94`),
    then title "This week" (27px / 800 / letter-spacing −.02em / `#14201C`, margin-top 3px).
  - Right: 44 × 44 tile, radius 14, background `#F0EDE5`, border `1px solid rgba(20,32,28,.07)`,
    containing an 18 × 18 circle outline (2px `#6B7A75`) — placeholder for a profile/settings icon.
- Stat row: padding `0 20px`, CSS grid `1fr 1fr`, gap 10.
  - **Avg fasting card** — background `#0D6E5E`, radius 18, padding `14px 15px 13px`,
    text `#EAF6F2`. Label "AVG FASTING" (10px / 700 / .1em / uppercase / opacity .72);
    value 30px / 800 / −.03em / tabular-nums with unit suffix (11px / 600 / opacity .75);
    caption "7-day average" (11px / 500 / opacity .75).
  - **Units today card** — background `#FFFFFF`, border `1px solid rgba(20,32,28,.09)`,
    radius 18, same padding. Label "UNITS TODAY" `#8B9A94`; value 30px / 800 + "u";
    caption "{am}u morning · {pm}u evening" (11px / 500 / `#8B9A94`).
- Scroll region: `flex:1`, `overflow:auto`, padding `16px 20px 120px`
  (the 120px bottom pad clears the floating nav).

**Day group** (repeat per day, margin-bottom 18)
- Group header row, gap 10, margin-bottom 9: day label (12px / 700 / .04em / `#14201C`),
  a 1px flexible rule `rgba(20,32,28,.09)`, then dose total (11px / 600 / `#8B9A94`)
  reading "`{n} units`" or "`no dose logged`".
- Day labels: `Today`, `Yesterday`, else `"Monday, Aug 24"` (weekday, short month, day).

**Entry row** (flex column of rows, gap 8)
- Row: flex, `align-items:center`, gap 12, background `#FFFFFF`,
  border `1px solid rgba(20,32,28,.09)`, radius 16, padding `12px 14px`.
- Status dot: 8 × 8 circle, color = reading status color, `flex-shrink:0`.
- Middle: slot label (14.5px / 700 / −.01em) over meta line (11.5px / 500 / `#8B9A94`,
  margin-top 1) formatted `"{time}  ·  {am}u AM  ·  {pm}u PM"` (joined with `"  ·  "`,
  dose parts omitted when null).
- Right, right-aligned: reading value (20px / 800 / −.03em / tabular-nums, colored by status)
  over status text (10.5px / 700 / .06em / uppercase / `#8B9A94`).
- **Newly saved row** (until the user leaves Logbook): background `#DCEDE8`,
  border `1px solid #0D6E5E`, plus a `riseIn` entrance animation.

**Copy of seeded sample data** (8 entries across 4 days, useful as fixtures):

| Day | Slot | Reading (mg/dL) | AM u | PM u |
|---|---|---|---|---|
| Today | Fasting | 118 | 14 | — |
| Today | After Lunch 2hr | 164 | — | — |
| Yesterday | Fasting | 131 | 14 | — |
| Yesterday | Before Dinner | 142 | — | 10 |
| Yesterday | 3 AM | 67 | — | — |
| −2d | Fasting | 124 | 12 | — |
| −2d | After Dinner | 176 | — | 12 |
| −3d | Fasting | 109 | 12 | — |

---

### 2. New reading (entry screen — the primary flow)

**Purpose:** log one reading plus optional insulin doses in as few taps as possible.

**Layout** — column: top bar (fixed), scrollable form, keypad dock (fixed bottom).

**Top bar** — padding `12px 16px 10px`, row, gap 12.
- Close button: 40 × 40, radius 13, background `#F0EDE5`, glyph "✕" 19px / 600 / `#3D4C47`.
  Discards draft, returns to Logbook.
- Title "New reading" — 17px / 700 / −.01em.

**Form region** — `flex:1`, `overflow:auto`, padding `2px 16px 14px`.

**a) Date field**
- Card: white, border `1px solid rgba(20,32,28,.09)`, radius 18, padding `12px 14px`,
  row, gap 12, centered.
- Stepper buttons `‹` and `›`: 36 × 36, radius 12, background `#F4F1EA`, glyph 17px / 700
  `#3D4C47`. `‹` goes back one day; `›` forward. `›` is **disabled** at today —
  color `#C6CFCB`, cursor default (no future dates).
- Center, centered text: label "DATE" (10px / 700 / .12em / uppercase / `#8B9A94`) over the
  value (16.5px / 700 / −.01em), formatted `"Today · Aug 27, 2026"`,
  `"Yesterday · Aug 26, 2026"`, else `"Mon · Aug 24, 2026"`.

**b) Time slot picker**
- Section label "TIME" (11px / 700 / .12em / uppercase / `#8B9A94`), margin `16px 0 9px`.
- Grid `1fr 1fr`, gap 8. Seven chips, in this order and with these default times:

  | Chip | Default time |
  |---|---|
  | Fasting | 6:30 AM |
  | Before Lunch | 12:30 PM |
  | After Lunch 2hr | 2:30 PM |
  | Before Dinner | 7:30 PM |
  | After Dinner | 9:30 PM |
  | 3 AM | 3:00 AM |
  | Custom | "Set time" → the chosen time once set |

- Chip: radius 15, padding `11px 13px`, `min-height 60`, column, centered vertically.
  - Unselected: background `#FFFFFF`, border `1px solid rgba(20,32,28,.09)`;
    name 13.5px / 700 / −.01em `#14201C`; time 11px / 600 `#8B9A94` (margin-top 2).
  - Selected: background `#0D6E5E`, border `1px solid #0D6E5E`; name `#EAF6F2`;
    time `rgba(234,246,242,.72)`.
  - Transition: `background .15s ease`. Single-select; default selection `Fasting`.
  - Hit area is ≥ 60px tall — keep ≥ 44dp in any port.

**c) Custom slot expansion** (renders only while `Custom` is selected, directly under the grid)
- Card: white, border `1px solid #0D6E5E`, radius 16, padding `12px 14px`, margin-top 9,
  entrance `riseIn .22s ease`.
- "LABEL THIS READING" (10px / 700 / .12em / uppercase / `#8B9A94`).
- Free-text input: full width, no box — only a 1.5px bottom rule `rgba(20,32,28,.14)`;
  text 16px / 600 `#14201C`; padding `7px 0 8px`; placeholder "e.g. After a walk".
- Row, gap 10, margin-top 12: caption "Time" (12.5px / 600 `#3D4C47`) + a time input
  (`flex:1`, border `1px solid rgba(20,32,28,.12)`, radius 11, background `#FBF9F4`,
  14.5px / 600, padding `9px 11px`, default `10:30`). Use the platform's native time picker.
- The custom label replaces the slot name everywhere the entry is displayed
  (falls back to "Custom" if left empty).

**d) Reading field**
- Section label "READING". Card: white, border **1.5px**, radius 18, padding `13px 15px`,
  row, `space-between`, centered. Tapping focuses the keypad on this field.
- Value: 34px / 800 / −.04em / tabular-nums. Empty state shows `––` in `#C6CFCB`;
  filled is `#14201C`. Unit suffix 13px / 700 `#8B9A94`.
- Status pill, right: 11.5px / 700 / .04em / uppercase, padding `6px 11px`, radius 999.
  Empty → text "Enter a value", `#8B9A94` on `#F4F1EA`. Otherwise per status thresholds below.
- **Focused field styling** (applies to reading/morning/evening alike):
  border `1.5px solid #0D6E5E` + `box-shadow: 0 0 0 3px rgba(13,110,94,.13)`;
  unfocused border `1.5px solid rgba(20,32,28,.09)`, no shadow.

**e) Insulin unit fields**
- Section label "INSULIN UNITS". Grid `1fr 1fr`, gap 10. Two cards, same card spec as above
  but column layout.
- Each: a dot + caption row (gap 6) — dot 7 × 7 circle, **Morning `#E0A422`**,
  **Evening `#5B6BC0`**; caption 11.5px / 700 `#3D4C47` ("Morning" / "Evening").
- Value row, margin-top 7: 27px / 800 / −.04em / tabular-nums (`––` `#C6CFCB` when empty)
  + "u" 12px / 700 `#8B9A94`.
- Helper text under the grid, margin-top 9, 11.5px / 500 `#8B9A94`, `text-wrap: pretty`:
  "Tap a field, then use the keypad. Leave a dose empty if you skipped it."

**f) Keypad dock** (always visible, does not scroll)
- Container: background `#F2EFE8`, border-top `1px solid rgba(20,32,28,.08)`,
  padding `10px 12px 12px`.
- Target row, padding `0 6px 8px`, `space-between`:
  left "Typing into: {Reading|Morning units|Evening units}" (11.5px / 700 `#3D4C47`);
  right the active unit ("mg/dL" / "mmol/L" for the reading, "units" for doses)
  (11px / 600 `#8B9A94`).
- Keys: grid `repeat(3, 1fr)`, gap 7. Order: `1 2 3 / 4 5 6 / 7 8 9 / 00 0 ⌫`.
  (The `00` key becomes `.` when the unit is mmol/L.)
- Key: height 52, radius 14, background `#FFFFFF`, border `1px solid rgba(20,32,28,.09)`,
  centered, 22px / 700 `#14201C`, tabular-nums, `user-select:none`. The `00`/`.` key uses
  19px. `⌫` uses background `#E4E0D6`, border `1px solid rgba(20,32,28,.06)`, 19px.
- Save button, margin-top 8: height 54, radius 16, centered, 16px / 700 / −.01em.
  - Enabled (reading non-empty): background `#0D6E5E`, text `#EAF6F2`, label "Save reading".
  - Disabled: background `#E4E0D6`, text `#9DA8A3`, label "Enter a reading to save",
    cursor default.

---

### 3. Save confirmation (full-screen overlay)

**Purpose:** confirm the write and let the user return to the logbook.

- Covers the whole content area: background `#0D6E5E`, column, centered, gap 18, padding 32,
  text `#EAF6F2`.
- Badge: 96 × 96 stack. Behind, a `#83E0CE` circle animating `ring 1.6s ease-out infinite`
  (scale .6 → 1.5, opacity .55 → 0). In front, an 80 × 80 `#83E0CE` circle with "✓"
  40px / 700 `#053C33`, entering with `pop .42s cubic-bezier(.2,1.3,.4,1)`.
- Headline "Reading saved" — 23px / 800 / −.02em, centered.
- Summary card: background `rgba(255,255,255,.13)`, radius 18, padding `14px 18px`,
  centered, `min-width 240`:
  slot + time (13px / 600 / opacity .8) · reading + unit (34px / 800 / −.03em / tabular-nums)
  · "{am}u morning · {pm}u evening" (12.5px / 600 / opacity .8, margin-top 4).
- Button **"View logbook"**: background `#EAF6F2`, text `#0D6E5E`,
  14.5px / 700, padding `13px 30px`, radius 15. Returns to Logbook with the new row highlighted.

---

### 4. Trends

**Purpose:** see whether control is improving, and where in the day it slips.

- Header: eyebrow "TRENDS" + title "Last 7 days" (same header type spec as Logbook).
- Scroll region padding `0 20px 120px`, cards stacked with margin-top 12.

**Fasting chart card** — white, border `1px solid rgba(20,32,28,.09)`, radius 20,
padding `16px 14px 10px`.
- Card head row, padding `0 4px 10px`: "Fasting reading" (13px / 700) and the unit
  (11px / 600 `#8B9A94`).
- SVG `viewBox="0 0 320 168"`, full width, `overflow: visible`. Plot band y = 12…142 (130 tall),
  x = 18 … 302, points evenly spaced.
  - Y scale: `lo = min(values, 70) − 15`, `hi = max(values, 140) + 15`,
    `y(v) = 12 + (hi − v) / (hi − lo) × 130`.
  - **Target-range band** (toggleable): rect from `y(140)` to `y(70)`, fill `#DCEDE8`, radius 6.
  - 4 horizontal gridlines at even thirds of the plot, `rgba(20,32,28,.08)`, 1px.
  - Line: `polyline`, stroke `#0D6E5E`, width 2.5, round cap/join, no fill.
  - Dots: r 4.5, fill `#FBF9F4`, stroke 2.5 = the point's **status color**.
  - X labels at y = 164: 10px / 600 `#8B9A94`, centered under each dot.
- Sample series (Thu→Wed): 134, 128, 141, 122, 109, 124, 118 mg/dL.

**Average by time slot card** — white, radius 20, padding `16px 16px 8px`.
- "Average by time slot" 13px / 700, margin-bottom 12.
- Per slot (all six fixed slots; Custom excluded), margin-bottom 12:
  name (12.5px / 600 `#3D4C47`) and value (12.5px / 700 tabular-nums, `—` if no data)
  on a baseline-aligned row, margin-bottom 5; then a track — height 7, radius 4,
  background `#F0EDE5`, containing a fill of `width = min(100, avg / 200 × 100)%`,
  radius 4, background = status color of the average.

**Insulin split card** — background `#14201C`, radius 20, padding `16px 18px`, text `#DDE7E3`.
- "INSULIN SPLIT" (10px / 700 / .12em / uppercase / `#8FA8A0`).
- Row, gap 22, margin-top 10: "Morning avg" and "Evening avg", each value 24px / 800
  tabular-nums with caption 11px / 600 `#8FA8A0`, separated by a 1px
  `rgba(255,255,255,.14)` divider.

---

### 5. Bottom navigation (Logbook + Trends only)

- Absolutely positioned, `left/right/bottom: 0`, padding `0 18px 14px`.
- Above the bar, a 34px scrim: `linear-gradient(to top, #FBF9F4, rgba(251,249,244,0))`.
- Bar: background `#14201C`, radius 22, padding `8px 8px 8px 10px`, row, gap 10,
  shadow `0 12px 30px rgba(20,32,28,.24)`.
- Two tabs, each `flex:1`, height 44, radius 16, centered, 13.5px / 700.
  Active: background `rgba(255,255,255,.12)`, text `#FBF9F4`.
  Inactive: transparent, text `rgba(251,249,244,.55)`.
- FAB (right): 52 × 44, radius 16, background `#83E0CE`, glyph "+" 25px / 600 `#053C33`.
  Opens the entry screen.

---

## Interactions & Behavior

**Navigation**
- `Logbook ⇄ Trends` via the two tabs. Leaving Logbook clears the "new entry" highlight.
- FAB `+` → entry screen with the default slot preselected, draft fields empty,
  keypad focused on Reading.
- Entry `✕` → back to Logbook, draft discarded (reading/am/pm cleared, focus reset).
- Save → confirmation overlay → "View logbook" returns to Logbook with the new row highlighted.
  (The mock keeps the overlay until dismissed; an auto-dismiss after ~1.6s is an acceptable
  alternative if the platform prefers it.)

**Single keypad, three targets**
- Exactly one of `reading | am | pm` is focused at a time. Tapping any of the three cards
  focuses it; the keypad's target label updates; the focused card gets the teal ring.
- Digit append rules: max length **5** for reading, **3** for a dose. A leading lone `0` is
  replaced by the next digit. `⌫` removes the last character. `.` (mmol/L only) is accepted
  once and only when the field is non-empty. `00` appends two zeros.
- No native keyboard is ever raised for numbers.

**Reading status thresholds** (mg/dL, applied to the stored mg/dL value)
- `< 70` → **Low** — `#B4741C` on `#FBEBD3`
- `70 – 140` → **In range** — `#0D6E5E` on `#DCEDE8`
- `> 140` → **High** — `#B3402E` on `#FAE2DD`

**Validation**
- Reading is the only required field; Save is disabled (and relabeled) until it has a value.
- Morning/Evening units are optional and stored as null when blank.
- Date cannot go past today.
- Custom label optional; empty falls back to "Custom".

**Animations**
- `riseIn` — `translateY(14px) → 0`, opacity 0 → 1; `.22s ease` (custom card),
  `.3s ease` (new logbook row).
- `pop` — scale .82 → 1.04 → 1 with opacity fade-in; `.42s cubic-bezier(.2,1.3,.4,1)`.
- `ring` — scale .6 → 1.5, opacity .55 → 0; `1.6s ease-out infinite`.
- Chip selection: `background .15s ease`.

**Not designed yet (flag before building)**
- Editing or deleting an existing entry; tapping a logbook row is currently inert.
- Empty state for a brand-new user with no entries.
- Sync/offline conflict handling, notes/photos per entry, reminders.

## State Management

Local screen state (all in one entry-flow model):

| State | Type | Notes |
|---|---|---|
| `view` | `'log' \| 'trends' \| 'entry' \| 'saved'` | route |
| `dayOffset` | int ≥ 0 | days back from today; `0` = today |
| `slot` | one of the 7 slot names | default `'Fasting'` |
| `customLabel` | string | only when `slot === 'Custom'` |
| `customTime` | `"HH:MM"` 24h | default `'10:30'` |
| `reading` | string (raw keypad buffer) | parsed on save |
| `am`, `pm` | string buffers | parsed to int or null |
| `focus` | `'reading' \| 'am' \| 'pm'` | keypad target |
| `entries` | Entry[] | newest first |
| `lastSaved` | Entry \| null | powers the confirmation summary |
| `newId` | id \| null | row to highlight; cleared on nav |

`Entry = { id, day (offset int), slot, customLabel?, customTime?, reading (mg/dL int), am: int|null, pm: int|null }`

**Persistence:** in a real build, store `reading` canonically in **mg/dL** and convert at
display time, so switching units never mutates data. Replace `day` offsets with real ISO
dates/timestamps; the offset scheme is a prototype convenience only.

**Data needs:** list entries for a date range; create entry; 7-day fasting series and
per-slot averages (computable client-side from the same list).

## Design Tokens

**Color**

| Token | Hex | Use |
|---|---|---|
| Surface | `#FBF9F4` | screen background |
| Card | `#FFFFFF` | cards, chips, keys |
| Surface sunken | `#F2EFE8` | keypad dock |
| Surface tint | `#F4F1EA` / `#F0EDE5` | stepper buttons, icon tiles |
| Surface pressed | `#E4E0D6` | delete key, disabled button |
| Border | `rgba(20,32,28,.09)` | 1px card border |
| Border subtle | `rgba(20,32,28,.08)` | dividers, chart gridlines (.08) |
| Ink | `#14201C` | primary text, nav bar, dark card |
| Ink secondary | `#3D4C47` | captions |
| Ink muted | `#8B9A94` | labels, meta |
| Ink faint | `#C6CFCB` | empty-value placeholder |
| Ink on dark muted | `#8FA8A0` | labels on `#14201C` |
| Ink on dark | `#DDE7E3` | text on `#14201C` |
| Primary | `#0D6E5E` | selection, CTA, in-range |
| Primary hover/press | `#0A564A` | link/press state |
| Primary container | `#DCEDE8` | in-range pill, chart band, new row |
| Primary on-dark text | `#EAF6F2` | text on primary |
| Accent bright | `#83E0CE` | FAB, success badge |
| Accent bright ink | `#053C33` | glyph on accent |
| Warn | `#B4741C` / bg `#FBEBD3` | Low |
| Danger | `#B3402E` / bg `#FAE2DD` | High |
| Morning dot | `#E0A422` | morning dose |
| Evening dot | `#5B6BC0` | evening dose |
| Focus ring | `rgba(13,110,94,.13)` | 3px spread |
| Nav shadow | `0 12px 30px rgba(20,32,28,.24)` | floating bar |

**Typography** — family `'Plus Jakarta Sans'` (Google Fonts, weights 400/500/600/700/800),
fallback `system-ui, sans-serif`. All numeric readouts use `font-variant-numeric: tabular-nums`.

| Role | Size / weight / tracking |
|---|---|
| Screen title | 27 / 800 / −.02em |
| Overlay headline | 23 / 800 / −.02em |
| Hero number | 34 / 800 / −.04em |
| Stat number | 30 / 800 / −.03em |
| Field number (dose) | 27 / 800 / −.04em |
| Row number | 20 / 800 / −.03em |
| Dark-card number | 24 / 800 |
| Screen bar title | 17 / 700 / −.01em |
| Field value | 16.5 / 700 / −.01em |
| Keypad digit | 22 / 700 |
| CTA | 16 / 700 / −.01em |
| Row title | 14.5 / 700 / −.01em |
| Chip name | 13.5 / 700 / −.01em |
| Tab / card title | 13.5–13 / 700 |
| Body caption | 12.5 / 600 |
| Meta | 11.5 / 500–700 |
| Eyebrow | 11 / 700 / .14em / uppercase |
| Section label | 11 / 700 / .12em / uppercase |
| Micro label | 10–10.5 / 700 / .1–.12em / uppercase |

**Spacing** — 2, 4, 5, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 32 px.
Screen gutter **20px** (Logbook/Trends) and **16px** (entry screen). Grid gaps 8–12.

**Radius** — 999 (pill) · 22 (nav bar) · 20 (large card) · 18 (card / field) ·
16 (row, key group, CTA) · 15 (chip, button) · 14 (key, icon tile) · 13–11 (small controls) ·
6–4 (chart band, bar track).

**Shadows** — floating nav `0 12px 30px rgba(20,32,28,.24)`;
focus ring `0 0 0 3px rgba(13,110,94,.13)`. Cards use borders, **not** shadows.

**Touch targets** — keypad keys 52px, CTA 54px, chips ≥ 60px, tabs 44px, steppers 36px
(bump to 44 on native).

## Assets
No images or icon files. Everything is type, CSS shapes, or inline SVG:
- Profile tile, status dots, dose dots — CSS circles (**profile is a placeholder**; substitute
  the codebase's real icon).
- Glyphs `✕ ‹ › + ✓ ⌫` are text characters — replace with the codebase's icon set.
- The chart is hand-built inline SVG; port to the codebase's charting library if it has one,
  preserving the band, gridlines, stroke width, and hollow status-colored dots.
- Font: **Plus Jakarta Sans** from Google Fonts. Bundle it in a native build.

## Files
| File | What it is |
|---|---|
| `Glucose Log App.dc.html` | The full interactive prototype — all four views, real state, the keypad logic, the chart. Open directly in a browser. |
| `android-frame.jsx` | Presentation-only Android bezel (status bar + gesture nav). Not part of the app. |

Reading the prototype: markup and inline styles are the visual spec; the `Component` class
holds the state model, keypad rules, status thresholds, and derived chart/average math —
the same logic described above.

Three build-time options are exposed in the prototype and are worth carrying into the real
app: **glucose unit** (mg/dL ↔ mmol/L), **target-range band** on the chart (on/off),
and **default time slot** on the entry screen.
