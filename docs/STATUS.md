# DrumsDR — Current State (2026-08-07)

Live: <https://drumsdr.web.app>. This is the "what's in the app now" summary for the
drummer/partner who authors the specs. For how it's built, see `ARCHITECTURE.md`. Raw
source specs are in `drummer-feedback-2026-07.md`.

## Drill sets in the app (10)

| Set | Base figures | At 2 & 4 bars |
|---|---|---|
| Right / Left — Snare (hands) | 16 | 256 |
| Left Hand + Left Foot | 16 | 256 |
| Right Hand + Left Foot | 16 | 256 |
| Left Hand + Right Foot | 16 | 256 |
| Right Hand + Right Foot | 16 | 256 |
| Right / Left — Kick (feet) | 16 | 256 |
| Three-Limb Linear — Right Foot (RH·LH·RF, green) | **36** | 1,296 |
| Three-Limb Linear — Left Foot (RH·LH·LF, orange) | **36** | 1,296 |
| Four-Limb Linear | 24 | 576 |
| Paradiddles (hands) | 10 | **46** (2-bar) · **2,206** (4-bar) |

## Recently delivered

- **Round 2, Phase 3 (Aug 2026) — the interactive Drum Key:**
  - A **🥁 Drum Key** button on any drill opens a re-voicing page. For each part of the
    drill (the two hands of a paradiddle, or each limb of a linear set) you pick a **color
    (limb)** and an **instrument**; the drill re-renders in those shapes/colors **and plays
    the real sounds**. E.g. a hand paradiddle → green/orange **squares** = the feet on kick.
  - Instrument rules enforced per the drummer's matrix: kick = feet only; snare/toms/ride/
    crashes = hands only; hi-hats = any limb; ghost = hands + snare only.
  - The full kit is playable now: snare, kick, three toms, closed/open hi-hat, ride, two
    crashes, plus **ghost notes** (soft small dot) and **rests** (blank that holds its slot).
  - Voicing is saved per drill (on this device) and shown by a highlighted Drum Key button.
  - *Not yet:* marking **individual** notes as ghosts (currently ghost applies to a whole
    part/color) — flagged for a follow-up.
- **Round 2, Phase 2 (Aug 2026):**
  - **Favorites (♥).** Every line in List view has a heart; tap it to save the line to a
    **★ Favorites** folder at the top of the drills list. Saved **on this device**
    (localStorage); tapping a favorite opens it in its own drill. (Cross-device sync waits
    for accounts.)
  - **Scroll focus.** Tap any exercise in the Scroll ribbon to pull it up on its own — it
    then **endlessly repeat-scrolls** that one pattern. "✕ Exit focus" returns to the ribbon.
- **Round 2, Phase 1 (Aug 2026 — see `drummer-feedback-2026-08.md`):**
  - **Paradiddles now complete.** 2- and 4-bar step through *every* valid combination
    under the rule "no 3 of the same hand in a row, even when looped" — **46** two-bar and
    **2,206** four-bar (generated, replacing the hand-curated 45/290). This dropped `2,8`
    (broke the rule on the loop) and added the missing `3,3` and `10,10`.
  - **4-bar fits on one line.** The shapes auto-scale so a whole 4-bar phrase stays on a
    single row — on a phone and on a laptop (no more 4th figure wrapping).
  - **1/4-note option** added to the Note toggle (now 1/4 · 8th · 16th) on the hand/foot
    drills — an even slower feel.
  - **Full drum key.** The Key panel now shows the whole kit: snare, kick, left/right/floor
    tom, closed/open hi-hat, ride, left/right crash, ghost note, and rest (blank). (These
    are shown in the key now; applying them to exercises is Phase 3.)
- **Page-1 asks (earlier):** two-bar (every 16 figures paired, 256) and four-bar phrase
  views; landscape scrolling ribbon that lights each figure in time; metronome in 8th-note
  feel (default) for a wider slow↔fast range.
- **Three-Limb Linear completed to 36** (was 11): every four-note linear ordering of right
  hand, left hand and right foot that uses all three limbs = exactly 36. Original 11 kept
  first, then completed.
- **Left-foot three-limb set** added — the same 36 with the left foot (orange) swapped for
  the right foot; its own set.
- **2- and 4-bar options** extended to both three-limb sets and the four-limb set (every
  combo paired with every other, using the `1,1 · 1,2 · 1,3 …` numbering).
- **Paradiddles** added: the 10 stickings plus the drummer's **curated combo lists** in his
  own numbering — 45 two-figure combos, 290 four-figure combos (e.g. `1,4`, `1,4,1,5`). His
  picks, not every possible combination.

## Practice features (all sets)

- 1 / 2 / 4-bar phrase view.
- Metronome with 1/4-, 8th- or 16th-note feel (on the hand/foot pairing drills), count-in.
- Tempo 30–200 BPM, volume.
- Loop one line, or play through a whole set.
- Landscape (or the *Scroll* button) = a ribbon that scrolls the figures left→right and
  lights each one in time, accurate at any tempo.
- Realistic drum sounds. Color = limb, shape = voice, read left→right.

## Decisions / assumptions to confirm

1. **Paradiddles are now generated, not curated** (round 2): the app enumerates the full
   valid set (46 / 2,206) under the no-3-in-a-row-looped rule, so the old hand-curated
   45/290 lists (with their dupes and 47 rule-breakers at 4 bars) are retired.
2. **Three-limb order:** "original 11 first, then completed." If a specific order is wanted,
   supply it and we'll match.
3. **Paradiddles are hands-only** — no feet or skill-level variants built yet.
4. Linear and paradiddle drills read as straight 16ths (the 8th/16th toggle is on the
   hand/foot drills).

## Not built yet

- **Per-note ghost marking** — Phase 3 shipped ghost as a per-part/per-color instrument;
  tapping *individual* notes to ghost them is the remaining piece.
- The **daily-text paradiddle subscription campaign** — on hold. It's a separate backend
  product (SMS provider + billing). The cleaned paradiddle combo data now in the app is the
  content it would reuse. Long-lead item when we start: Twilio A2P 10DLC registration; also
  a Stripe integration and the bundled-vs-separate pricing decision.
