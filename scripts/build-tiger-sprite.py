#!/usr/bin/env python3
"""Build tiger-sprite.png — the widget character's sprite sheet.

Takes the approved tiger frames (right-facing walk/run/jump + idle/tail/sit;
left-facing is produced at runtime with CSS scaleX(-1)), crops them all to one
common rectangle so the animation stays anchored, downscales, packs them into a
single horizontal strip, and quantises to an indexed (PNG-8) palette with 1-bit
transparency. That keeps the exact reference art while shrinking the payload from
~650 KB of raw frames to ~22 KB — small enough to serve from the CDN like
data/contributions.json.

Frames are used verbatim — including the artist's baked-in base + ground shadow,
which is already drawn correctly per pose (small and low for the airborne jump
frame), so the widget needs no separate shadow and casts none. Nothing is keyed
or erased, so no tiger pixels are ever lost.

Source: the frames live as base64 PNGs in the approved demo HTML. Pass its path:
    python3 scripts/build-tiger-sprite.py path/to/demo.html
The frame grid it prints (cell size, per-mode start/count) must match the
constants in widget.js.
"""
import sys, re, io, os, json, base64
import numpy as np
from PIL import Image

# right-facing / symmetric source keys -> widget mode names, in sheet order
ORDER = [("idle", "idle"), ("walkR", "walk"), ("runR", "run"),
         ("jumpR", "jump"), ("tail", "tail"), ("sit", "sit")]
CROP   = (6, 4, 163, 90)   # common crop (union of all frames' content) -> keeps anchor
CELL_H = 64                # content height in px (before gutter)
GUTTER = 4                 # transparent margin around every cell — stops frames
                           # bleeding into each other at fractional device-pixel
                           # ratios (the content otherwise touches the cell edge)
COLORS = 32                # palette size (incl. 1 transparent index)
ALPHA_THRESHOLD = 128      # binary transparency cutoff

def load_frames(html_path):
    html = open(html_path).read()
    obj = json.loads(re.search(r'const frames = (\{.*?\});', html, re.S).group(1))
    frames, meta, idx = [], {}, 0
    for key, name in ORDER:
        meta[name] = {"start": idx, "count": len(obj[key])}
        for uri in obj[key]:
            im = Image.open(io.BytesIO(base64.b64decode(uri.split(",", 1)[1]))).convert("RGBA")
            frames.append(im.crop(CROP))     # verbatim — keep the baked base + shadow
            idx += 1
    return frames, meta

def build(frames, out_path):
    cw, ch = CROP[2] - CROP[0], CROP[3] - CROP[1]
    content_w = round(cw * CELL_H / ch)
    cell_w = content_w + 2 * GUTTER          # padded cell (content + gutter)
    cell_h = CELL_H + 2 * GUTTER
    n = len(frames)
    sheet = Image.new("RGBA", (cell_w * n, cell_h), (0, 0, 0, 0))
    for i, im in enumerate(frames):
        cell = im.resize((content_w, CELL_H), Image.LANCZOS)
        sheet.paste(cell, (i * cell_w + GUTTER, GUTTER))    # centred, gutter all round
    # PNG-8 with a reserved transparent index (soft alpha -> 1-bit at THRESHOLD)
    alpha = np.array(sheet.split()[3])
    q = sheet.convert("RGB").quantize(colors=COLORS - 1, method=Image.FASTOCTREE)
    arr = np.array(q)
    tindex = COLORS - 1
    arr[alpha < ALPHA_THRESHOLD] = tindex
    out = Image.fromarray(arr.astype("uint8"), "P")
    out.putpalette(q.getpalette()[:(COLORS - 1) * 3] + [0, 0, 0])
    out.save(out_path, optimize=True, transparency=tindex, bits=8)
    return cell_w, cell_h, n, os.path.getsize(out_path)

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "demo.html"
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(__file__), "..", "tiger-sprite.png")
    frames, meta = load_frames(src)
    cell_w, cell_h, n, size = build(frames, out)
    print("wrote", os.path.abspath(out))
    print(f"cell {cell_w}x{cell_h}px (gutter {GUTTER}) · {n} frames · {size/1024:.1f} KB")
    print("frame grid:", json.dumps(meta))
