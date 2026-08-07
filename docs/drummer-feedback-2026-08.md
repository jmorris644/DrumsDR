# Drummer feedback — August 2026 (round 2, source of truth)

Second wave of change requests from Joe's drummer partner, with his answers to the
clarifying questions and the **locked decisions** we're building from. For round 1 (the
page-1 asks + the original paradiddle combos), see `drummer-feedback-2026-07.md`.

Build is split into phases (below). This file is the spec; `STATUS.md` tracks what's shipped.

---

## Verbatim requests (as sent)

1. For 2- and 4-bar paradiddle sections, take each of the 10 figures and combine with
   every other for both 2 bars and 4 bars. He'd only curated through figure ~6 at 4 bars.
   **The paradiddles (2 or 4 bar) can never have 3 of the same limb (color) in a row —
   even when looped.** He doesn't trust his own completeness, so redo them from figure one
   to cover every valid combination.
2. In the 4-bar view the 4th figure drops to the next line, hard to follow in a loop.
   Lessen the scale so a 4-bar phrase fits on one line — on the phone in landscape and on
   his laptop.
3. In Scroll view, tap an exercise to bring it up isolated as its own exercise, one at a
   time, separated from the rest of the line.
4. Add a **1/4-note** option in addition to 1/8 and 1/16.
5. A **favorites** list — a ♥ (or drag-and-drop) to save a liked exercise/combo into a
   favorites section.
6. In the drum key, add the rest of the kit: closed hi-hat, open hi-hat, left tom, right
   tom, floor tom, ride, left crash, right crash (plus ghost note and rest, see #8).
7. Bring the drum key in as its **own page**: the user picks a color (limb) + an instrument
   and it re-voices the exercise — e.g. paradiddle circles become squares and the colors
   become green/orange (feet on kick), or a red circle + green square, etc.
8. The drum key also lists a **ghost note** (small dot = light tap) and a **rest** (dash).
   Change the rest to **blank space**: assigning "rest" to a symbol leaves that slot empty
   with no limb, holding its place. E.g. 🔴🔵🔴🔴 → 🔴 ▢ 🔴🔴; 🔴🔵🔵🔴 → 🔴 ▢ ▢ 🔴.

## Clarifying Q&A — locked answers

**Paradiddle rule (#1)**
- Want the **full** valid set for now: **46** two-bar, **2,206** four-bar (computed).
- "No 3 in a row" applies to **2- and 4-bar phrases, each looped on its own** (the wrap
  from end→start is checked). The single 1-bar figures are exempt — the 10 figures are just
  the framework for combining.
- Strictly **three** is the limit; two of the same hand back-to-back is fine. His example
  🔴🔴🔵🔴 🔵🔴🔵🔵 (= combo 5,1) is valid (two reds, two blues, no three).
- Consequences vs the old curated lists: 2-bar was missing `3,3` and `10,10` and wrongly
  included `2,8` (breaks the rule on the loop); 4-bar included 47 rule-breakers and stopped
  near figure 6. The generated set supersedes both.

**Scroll isolate (#3)** — the isolated exercise should **endlessly scroll, repeating** (not
a static centered loop).

**Favorites (#5)** — **heart tap** (not drag-and-drop). Saved **on-device** (localStorage)
for now; cross-device sync is a later want, once there are subscribers/accounts. Build it so
it can migrate to accounts later.

**Interactive drum key (#7)** — re-voicing **changes the actual sound** (green square really
plays a right-foot kick), not just the on-screen color/shape. It lives on its **own in-app
screen**. Start with the 2-symbol drills (paradiddles + hand/foot drills); the 3-/4-limb
linear sheets get a "pick an instrument per limb" version.

**Ghost & rest (#8)** — rest = **blank that holds its slot** so timing still reads. Ghost
notes: support **both** per-color ("all right-hand hits are ghosts") **and** individual
per-note marking (the user marks them). Ghost notes are **only red/blue and only on the
snare** (that's why the symbol is a small dot) — drummers don't ghost other instruments.

## Instrument ↔ limb rules (for the #7 re-voicing screen)

His final matrix (color = limb, shape = instrument; the two are independent):

| Color (limb) | Instruments it may play |
|---|---|
| 🔵 Blue = right hand | snare ●, left tom ◉, right tom ◎, floor tom ○, ride ⬟, left crash ▼, right crash ▲, closed hi-hat ◆, open hi-hat ◇, ghost note · (snare only) |
| 🔴 Red = left hand | *same as blue* |
| 🟠 Orange = left foot | kick ■, closed hi-hat ◆, open hi-hat ◇ |
| 🟢 Green = right foot | *same as orange* — kick ■, closed hi-hat ◆, open hi-hat ◇ |

Equivalent rule, by instrument:
- **Kick ■** → feet only (orange, green).
- **Snare, 3 toms, ride, 2 crashes** → hands only (red, blue).
- **Hi-hats (open & closed) ◆ ◇** → any limb (either hand or either foot).
- **Ghost note ·** → hands only, snare only.

## Drum-key symbols (from `PDFs/drumkey.pdf`)

| Symbol | Instrument |
|---|---|
| ● filled circle | Snare |
| ■ filled square | Kick |
| ◉ filled circle w/ hole | Left tom |
| ◎ bold hollow ring | Right tom |
| ○ thin hollow circle | Floor tom |
| ◆ filled diamond | Closed hi-hat |
| ◇ hollow diamond | Open hi-hat |
| ⬟ filled pentagon | Ride |
| ▼ filled down-triangle | Left crash |
| ▲ filled up-triangle | Right crash |
| · small dot | Ghost note (snare, hands only) |
| (blank) | Rest — empty, holds its slot |

Colors: red = left hand, blue = right hand, orange = left foot, green = right foot.

---

## Build phases

**Phase 1 — quick wins (this branch: `drummer-feedback-2026-08`)**
1. Regenerate paradiddle combos: complete rule-following sets — 46 two-bar, 2,206 four-bar
   (replaces the curated lists; generated at runtime under the no-3-looped rule).
2. Fit a 4-bar phrase on one line in List view (auto-scale the shapes).
3. Add the 1/4-note option to the Note toggle.
4. Draw all 12 drum-key symbols in the Key legend.

**Phase 2 — Favorites + Scroll-isolate — DONE (branch only)**
- Heart-tap favorites in localStorage (`drumsdr.favorites.v1`, structured to sync to
  accounts later); a **★ Favorites** folder at the top of the drills list; tapping a
  favorite navigates to it in its source drill. (`favView` + `favs` in `app.js`.)
- Tap an exercise in Scroll → focus mode: `enterIsolate()` streams `ISO_COPIES` copies of
  the one exercise as an endless conveyor (mode forced to play-through), "✕ Exit focus"
  restores. Timing stays correct because the source `sheetKey` still drives `perBeat`.

**Phase 3 — Interactive drum-key page**
- New in-app screen. Per-symbol (2-symbol drills) / per-limb (linear) color+instrument
  assignment, enforcing the matrix above, re-rendering shapes/colors AND playing the real
  sounds. Rest = assign to a symbol → blank slot, silent, timing preserved. Ghost notes:
  per-color + per-note (snare/hands only), soft small dot.

Note: 2,206 four-bar rows is heavy for the non-virtualized List view (~35k DOM nodes) — may
need list-view virtualization to stay smooth on a phone (Scroll is already virtualized).
