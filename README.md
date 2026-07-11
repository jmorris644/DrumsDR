# DrumsDR — Drum Coordination Trainer

A visual/audio practice trainer built on the DrumsDR color-and-shape drum notation.

- **Color = limb**: red = left hand, blue = right hand, green = right foot, orange = left foot
- **Shape = voice**: circle = snare (hands), square = kick (feet)

## Contents

- `PDFs/` — the original notation sheets (source of truth for the drills)
- `public/index.html` — the trainer webapp (single self-contained file: Web Audio playback, metronome, count-in, tempo, loop-line / play-through, shape lighting synced to the audio clock)
- `tools/extract_patterns.py` — parses the PDFs and regenerates the pattern data embedded in the app

## Deploy (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>   # or: firebase init hosting (keep public/ as the folder)
firebase deploy --only hosting
```

## Local preview

Just open `public/index.html` in a browser — no build step, no server needed.
