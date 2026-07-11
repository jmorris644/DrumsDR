#!/usr/bin/env python3
"""Extract DrumsDR pattern data from the notation PDFs.

Renders each sheet to pixels, finds every colored symbol blob, classifies it:
  color -> limb   (red=LH, blue=RH, green=RF, orange=LF)
  shape -> voice  (circle=snare, square=kick; squares fill their bounding box)
then clusters symbols into rows and emits compact JSON used by public/index.html.

Usage:  pip install PyMuPDF scipy numpy
        python3 tools/extract_patterns.py  > patterns.json
"""
import fitz, numpy as np, json, os, sys
from scipy import ndimage

CANON = {"LH": (1, 0, 0), "RH": (0, 0, 1), "RF": (0, .5, 0), "LF": (1, .5, 0)}

def limb_of(rgb):
    r, g, b = np.asarray(rgb, dtype=float) / 255.0
    best, bd = None, 9
    for k, (cr, cg, cb) in CANON.items():
        d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
        if d < bd:
            bd, best = d, k
    return best if bd < 0.25 else None

def extract(path):
    page = fitz.open(path)[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
    r, g, b = (img[:, :, i].astype(int) for i in range(3))
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    lbl, n = ndimage.label((mx > 120) & ((mx - mn) > 60))   # saturated color only
    syms = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(xs) < 200:
            continue
        h = ys.max() - ys.min() + 1; w = xs.max() - xs.min() + 1
        limb = limb_of(img[ys, xs].mean(0))
        if not limb:
            continue
        voice = "kick" if len(xs) / (h * w) > 0.90 else "snare"  # square fills bbox, circle ~0.79
        syms.append((ys.mean(), xs.mean(), limb, voice, h))
    syms.sort()
    rows, cur, last = [], [], None
    for s in syms:
        if last is not None and s[0] - last > max(20, s[4] * 0.9):
            rows.append(cur); cur = []
        cur.append(s); last = s[0]
    if cur:
        rows.append(cur)
    grid = []
    for row in rows:
        cell = [{"limb": s[2], "voice": s[3]} for s in sorted(row, key=lambda s: s[1])]
        half = len(cell) // 2
        if len(cell) % 2 == 0 and cell[:half] == cell[half:]:  # sheets print each cell twice
            cell = cell[:half]
        grid.append(cell)
    return grid

if __name__ == "__main__":
    pdf_dir = os.path.join(os.path.dirname(__file__), "..", "PDFs")
    lib = {}
    for f in sorted(os.listdir(pdf_dir)):
        if not f.endswith(".pdf") or "drumkey" in f or "(1)" in f:
            continue
        lib[f[:-4]] = {"rows": extract(os.path.join(pdf_dir, f))}
        print(f"{f}: {len(lib[f[:-4]]['rows'])} rows", file=sys.stderr)
    json.dump(lib, sys.stdout)
