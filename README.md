# gitWidget

A small, on-brand GitHub contribution widget for [design.bagaria.me](https://design.bagaria.me).
Your real last-year activity, refreshed daily, with a few quiet details:

- **Contribution grid** — themed to inherit the host page's design tokens (`--ink`, `--good`, `--accent`, `--mono`).
- **Blank-artboard empty state** — days with no activity render as a faint designer dot-grid (a Figma/Sketch canvas), so quiet days read as open canvas, not dead squares. Your commits are the elements placed on it.
- **A pixel tiger** — a tiny orange, black-striped tiger sprite prowls the top of the grid: it follows your cursor, walks and breaks into a run when chasing, blinks when idle, and leaps on click. Hand-drawn as inline SVG pixels (no image assets), so it stays self-contained.
- **Subtle hover audio** — sweeping the grid plays a soft pentatonic note per active day (higher/louder for busier days, silent on empty days). Audio unlocks on first interaction, per browser policy.

## How it works

No GitHub token ever touches the browser. A scheduled GitHub Action fetches the
public contribution calendar server-side and writes a tiny static JSON; the widget
just reads that JSON over a CDN.

```
GitHub GraphQL API
        │   (daily, in CI, token stays server-side)
        ▼
scripts/fetch-contributions.mjs ──► data/contributions.json ──► jsDelivr CDN ──► widget
```

- [`scripts/fetch-contributions.mjs`](scripts/fetch-contributions.mjs) — fetches the calendar + derives stats.
- [`.github/workflows/update.yml`](.github/workflows/update.yml) — runs it daily (03:30 UTC = 09:00 IST) and commits the JSON.
- [`data/contributions.json`](data/contributions.json) — the generated data (updated by the Action).
- [`widget.js`](widget.js) — the embeddable widget and single source of truth for all render logic (inherits the host page's CSS variables).
- [`embed.html`](embed.html) — a standalone/iframe page that just themes and loads `widget.js` (no duplicated logic).

The Action uses the built-in `GITHUB_TOKEN` (enough for public contributions).
To include private contribution counts, add a `GH_TOKEN` repo secret (a token with
`read:user`) and it'll be used automatically.

## Embed it

Paste this where the widget should appear (e.g. the footer). It inherits your
page's CSS variables, so it matches automatically; the fallbacks cover anywhere
those aren't defined.

```html
<div id="gitwidget"></div>
<script src="https://cdn.jsdelivr.net/gh/abhibagaria/gitWidget@main/widget.js" defer></script>
```

Or, fully isolated (won't touch your page), use an iframe (needs GitHub Pages enabled):

```html
<iframe src="https://abhibagaria.github.io/gitWidget/embed.html"
        style="width:100%;max-width:680px;height:200px;border:0" loading="lazy"></iframe>
```

By default the widget reads from `raw.githubusercontent.com` first (≈5 min cache),
then falls back to jsDelivr. To override the source order — e.g. to try a
same-origin copy first when hosting the JSON yourself — set `window.GITWIDGET_SOURCES`
to an array of URLs before loading the script (this is how `embed.html` prefers its
local `./data/contributions.json`).

## Run the fetch locally

```bash
GH_TOKEN=ghp_xxx GH_LOGIN=abhibagaria node scripts/fetch-contributions.mjs
```

To update on demand instead of waiting for the daily run: `gh workflow run update.yml`.
