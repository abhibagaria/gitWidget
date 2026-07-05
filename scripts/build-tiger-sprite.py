#!/usr/bin/env python3
"""Build tiger-sprite.png — the widget character's sprite sheet.

Packs all 30 approved tiger frames (walk/run/jump in both directions + idle,
tail-swish, sit) into one horizontal strip and quantises it to an indexed
(PNG-8) palette with 1-bit transparency — the exact reference art at ~30 KB,
small enough to serve from the CDN like data/contributions.json.

Frames are used verbatim, including the artist's baked-in base + ground shadow
(already drawn correctly per pose — small and low under the airborne jump), so
the widget needs no separate shadow. Nothing is keyed or erased, so no tiger
pixels are ever lost.

The reference poses are drawn on different ground lines (walk/run feet sit ~8px
higher than idle/tail/sit). If we packed a fixed crop window the tiger would bob
vertically and the lowest frames' feet would land at the cell edge (and get
clipped by a host container). So every frame is aligned by its **feet line** to a
common baseline, horizontally centred on the body, with a generous transparent
margin all round — a stable ground line and a clip-proof, bleed-proof border.

Source: the frames live as base64 PNGs in the approved demo HTML. Pass its path:
    python3 scripts/build-tiger-sprite.py path/to/demo.html
The frame grid it prints (cell size, baseline, per-mode start/count) must match
the constants in widget.js.
"""
import sys, re, io, os, json, base64
import numpy as np
from PIL import Image

# source pose keys -> widget mode names, in sheet order (direction-native)
ORDER = [("walkR", "walkR"), ("walkL", "walkL"), ("runR", "runR"), ("runL", "runL"),
         ("jumpR", "jumpR"), ("jumpL", "jumpL"), ("idle", "idle"),
         ("tail", "tail"), ("sit", "sit")]
MARGIN  = 8       # transparent margin (source px) around the aligned content
SHEET_H = 84      # sheet cell height in px (frames are downscaled to this)
COLORS  = 32      # palette size (incl. 1 transparent index)
ALPHA_THRESHOLD = 128

def feet_row(im):
    """Bottom row of solid (orange/dark) tiger pixels — the feet/ground contact,
    ignoring the softer grey shadow that sits just below."""
    a = np.array(im); al = a[:, :, 3]; rgb = a[:, :, :3].astype(int)
    sat = rgb.max(2) - rgb.min(2); light = rgb.mean(2)
    solid = ((sat > 26) | (light < 120)) & (al > 60)
    ys = np.where(solid.max(1))[0]
    return int(ys.max()) if len(ys) else im.height - 1

def load_frames(html_path):
    html = open(html_path).read()
    obj = json.loads(re.search(r'const frames = (\{.*?\});', html, re.S).group(1))
    frames, meta, idx = [], {}, 0
    for key, name in ORDER:
        meta[name] = {"start": idx, "count": len(obj[key])}
        for uri in obj[key]:
            frames.append(Image.open(io.BytesIO(base64.b64decode(uri.split(",", 1)[1]))).convert("RGBA"))
            idx += 1
    return frames, meta

def build(frames, out_path):
    bbs  = [f.getbbox() for f in frames]
    feet = [feet_row(f) for f in frames]
    above = max(ft - bb[1] for ft, bb in zip(feet, bbs))        # feet -> top of tiger
    below = max(bb[3] - 1 - ft for ft, bb in zip(feet, bbs))    # feet -> bottom of shadow
    width = max(bb[2] - bb[0] for bb in bbs)
    cw = width + 2 * MARGIN
    ch = above + below + 2 * MARGIN
    baseline = MARGIN + above                                   # feet row within the cell

    # place each frame so its feet sit on `baseline` and its body is centred
    factor = SHEET_H / ch
    cwd = round(cw * factor)
    n = len(frames)
    sheet = Image.new("RGBA", (cwd * n, SHEET_H), (0, 0, 0, 0))
    for i, (f, bb, ft) in enumerate(zip(frames, bbs, feet)):
        cell = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        ox = round(cw / 2 - (bb[0] + bb[2]) / 2)
        cell.paste(f, (ox, baseline - ft), f)
        sheet.paste(cell.resize((cwd, SHEET_H), Image.LANCZOS), (i * cwd, 0))

    # PNG-8 with a reserved transparent index (soft alpha -> 1-bit at THRESHOLD)
    alpha = np.array(sheet.split()[3])
    q = sheet.convert("RGB").quantize(colors=COLORS - 1, method=Image.FASTOCTREE)
    arr = np.array(q); tindex = COLORS - 1
    arr[alpha < ALPHA_THRESHOLD] = tindex
    out = Image.fromarray(arr.astype("uint8"), "P")
    out.putpalette(q.getpalette()[:(COLORS - 1) * 3] + [0, 0, 0])
    out.save(out_path, optimize=True, transparency=tindex, bits=8)
    return cwd, SHEET_H, round(baseline * factor), n, os.path.getsize(out_path)

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "demo.html"
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(__file__), "..", "tiger-sprite.png")
    frames, meta = load_frames(src)
    cw, chh, baseline, n, size = build(frames, out)
    print("wrote", os.path.abspath(out))
    print(f"cell {cw}x{chh}px · baseline row {baseline} · {n} frames · {size/1024:.1f} KB")
    print("frame grid:", json.dumps(meta))
