# DrumsDR — Current State (2026-07-28)

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
| Paradiddles (hands) | 10 | **45** (2-bar) · **290** (4-bar) |

## Recently delivered

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
- Metronome with 8th- or 16th-note feel (on the hand/foot pairing drills), count-in.
- Tempo 30–200 BPM, volume.
- Loop one line, or play through a whole set.
- Landscape (or the *Scroll* button) = a ribbon that scrolls the figures left→right and
  lights each one in time, accurate at any tempo.
- Realistic drum sounds. Color = limb, shape = voice, read left→right.

## Decisions / assumptions to confirm

1. **Paradiddle list cleanup:** removed 9 exact duplicate four-figure combos (e.g. `1,4,2,8`
   listed twice); validated every reference is a real figure 1–10 (all valid — figures 9/10
   are used rarely but kept); kept his list order.
2. **Three-limb order:** "original 11 first, then completed." If a specific order is wanted,
   supply it and we'll match.
3. **Paradiddles are hands-only** — no feet or skill-level variants built yet.
4. Linear and paradiddle drills read as straight 16ths (the 8th/16th toggle is on the
   hand/foot drills).

## Not built yet

- The **daily-text paradiddle subscription campaign** — on hold. It's a separate backend
  product (SMS provider + billing). The cleaned paradiddle combo data now in the app is the
  content it would reuse. Long-lead item when we start: Twilio A2P 10DLC registration; also
  a Stripe integration and the bundled-vs-separate pricing decision.
