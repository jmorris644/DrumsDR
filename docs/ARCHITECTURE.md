# DrumsDR — Architecture

Drum Coordination Trainer. A **static, client-side Web Audio app** — no build step, no
backend. Deployed to Firebase Hosting at <https://drumsdr.web.app> (project `drumsdr`).

## Files

Everything shipped lives in `public/` (that's the only thing Firebase deploys):

| File | Responsibility |
|---|---|
| `index.html` | Markup only (~106 lines). Links the stylesheet and the four scripts. |
| `styles.css` | All CSS. |
| `drills.js` | `const DATA` — the drill content (see **Data model**). One long JSON line. |
| `samples.js` | `const SAMPLE_B64` — base64 drum samples. One long line. |
| `phrases.js` | **Pure, DOM-free** drill/phrase logic. Node-testable. |
| `app.js` | Everything else: DOM rendering, audio engine, scheduler, controls, boot. |

Supporting (not deployed):

| Path | Purpose |
|---|---|
| `test/drills.test.js` | Node unit tests. Run with `npm test`. |
| `package.json` | Just the `test` script. |
| `firebase.json` | Hosting config. `no-cache` on html/js/css (stable filenames, no hashing). |
| `docs/` | This doc, `STATUS.md`, and `drummer-feedback-2026-07.md` (spec source of truth). |

### Load order matters
The scripts are **classic scripts** (not ES modules). Top-level `const`/`let`/`function`
in a classic script go into the shared global lexical environment, so later scripts can
read them. Order in `index.html` is therefore load-bearing:

```
drills.js  →  samples.js  →  phrases.js  →  app.js
```

`phrases.js` reads `DATA` (from `drills.js`); `app.js` reads `DATA`, `SAMPLE_B64`, and the
`phrases.js` functions. `phraseBars` is declared in `phrases.js` and reassigned by `app.js`
(assignment to the shared binding — works because `app.js` runs last).

## Data model (`drills.js` → `DATA`)

```
DATA = {
  order:  [sheetKey, ...],                       // display order of the drill sheets
  meta:   { sheetKey: {name, tag, desc} },       // sheet header text
  sheets: { sheetKey: [ figure, ... ] },         // a figure = ["RHs","LHs",...] (4 tokens)
}
```

A sheet may optionally ship an explicit `DATA.combos[key] = {"2":[[i,j]…],"4":[[i,j,k,l]…]}`
list (1-based figure indices), but nothing does today — paradiddles now **generate** their
combos in `phrases.js` (see below).

**Token = limb + voice.** Limb ∈ `RH`(right hand) `LH`(left hand) `RF`(right foot)
`LF`(left foot); voice letter ∈ `s`(snare) `k`(kick) `t`(tom) `h`(hat) `r`(ride) `c`(crash).
So `"RHs"` = right hand on snare, `"RFk"` = right foot on kick. Color = limb, shape = voice.

## Phrasing model (`phrases.js`)

A drill sheet produces **rows** (each row = one phrase = a flat list of tokens). How rows
are built depends on the sheet type. The single entry point is `baseFigures(key)`, which
returns the sheet's list of one-bar figures (or `null` for a non-phrasing sheet):

1. **Generated (two-symbol)** — keys in `GEN` (e.g. hands, hand+foot pairs, feet). The 16
   orderings of two symbols (`PAT16`) are generated on the fly.
2. **Linear** — keys in `LINEAR` (`RHLHRF`, `RHLHLF`, `RHLHRFLF`). Figures come straight
   from `DATA.sheets[key]` (hand-curated figure lists: 36 / 36 / 24).
3. **Combo sheets** — `paradiddle`. Figures are `DATA.sheets[key]` (the 10 stickings); the
   2-/4-bar *combos* are supplied by `comboList(key)`. Paradiddle is in the `NO3` set, so
   `comboList` **generates** every valid combo — every combination of the figures with no
   run of 3+ of the same limb anywhere, checked **cyclically** (each exercise loops on
   itself): **46** two-bar, **2,206** four-bar (memoized). A sheet could instead read an
   explicit `DATA.combos[key]` list.

**Phrase length** is the global `phraseBars` (1, 2, or 4). `buildRows(key)`:

- **1 bar** → the base figures themselves.
- **2 / 4 bar, generated & linear** → *every ordered pair* `(i,j)` of figures. 2-bar =
  `figs[i] ++ figs[j]`; 4-bar = arch form `i,j,j,i`. Count = `n²`.
- **2 / 4 bar, combo sheet** → only the combos from `comboList(key)["2"|"4"]` (generated for
  paradiddles), in lexicographic figure order. `rowLabel` shows the notation (`1,4`, `1,4,1,5`).

`rowLabel` and `rowCountFor` mirror the same three cases. The `8th/16th` note-value toggle
is shown for generated sheets only; linear and curated read as straight 16ths.

## Scheduler / timing (`app.js`)

Web Audio clock-driven (look-ahead scheduler, `AHEAD`/`TICK`). Key line:

```js
const perBeat = GEN[sheetKey] ? notesPerBeat : (baseFigures(sheetKey) ? 4 : steps);
```

- Generated drills: `perBeat` = the 8th/16th toggle (2 or 4 hits per beat).
- Figure-list drills (linear, paradiddles): **each 4-note figure = one beat** (straight
  16ths), so a 2-bar phrase is 2 beats and a 4-bar phrase is 4 beats — tempo stays correct
  at any phrase length.

## Rendering (`app.js`)

- **List view**: every row rendered in flow. Not virtualized — heavy on the big sheets
  (linear 2/4-bar = 1296 rows, paradiddle 4-bar = 290). Fine on desktop; a future polish is
  list virtualization for phones in portrait.
- **Scroll ribbon** (landscape / `Scroll`): **virtualized** — only ~24 rows are ever in the
  DOM (`rowElByIndex` map + a spacer sizing the scroll extent). Scroll position is driven by
  the audio clock (`ribbonFollow`), so it's tempo-accurate at any BPM. Auto-engages on
  landscape phones.

## Adding a drill

- **Two-symbol** (a↔b alternation): add a `GEN[key] = {a,b}` entry + `meta`/`order`. Rows
  generate automatically.
- **Linear / figure list**: add the figure list to `DATA.sheets[key]`, add `key` to the
  `LINEAR` set in `phrases.js`, + `meta`/`order`.
- **Combo sheet**: add `DATA.sheets[key]` (base figures) + `meta`/`order`. Then either add
  `key` to `NO3` in `phrases.js` to auto-generate the no-3-in-a-row combos, or ship an
  explicit `DATA.combos[key]` (`"2"`/`"4"` tuple lists) — `comboList(key)` picks up either.

Regenerate/patch `drills.js` with a small node script (load `DATA` via `new Function`,
mutate, `JSON.stringify` back) rather than hand-editing the long line. Then add assertions
to `test/drills.test.js` and run `npm test`.

## Testing & deploy

- `npm test` — logic/data assertions against the real `drills.js` + `phrases.js`.
- Headless Chrome screenshots + built-in `#selftest` / `#scrolltest`; see the testing notes
  in Claude memory (`drumsdr-testing`) for the exact commands and the `#pick=` harness trick.
- Deploy: `firebase deploy --only hosting --project drumsdr` (plain static hosting).
