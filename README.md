# gitWidget

A small, on-brand GitHub contribution widget — a quiet pixel creature strolls your
last-year grid, themed to match [design.bagaria.me](https://design.bagaria.me).

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
- [`.github/workflows/update.yml`](.github/workflows/update.yml) — runs it daily (06:17 UTC) and commits the JSON.
- [`data/contributions.json`](data/contributions.json) — the generated data (updated by the Action).
- [`embed.html`](embed.html) — the standalone widget that reads the JSON.

The Action uses the built-in `GITHUB_TOKEN` (enough for public contributions).
To include private contribution counts, add a `GH_TOKEN` repo secret (a token with
`read:user`) and it'll be used automatically.

## Embed it on your site

Paste this where the widget should appear (e.g. the footer). It inherits your
page's CSS variables (`--ink`, `--good`, `--accent`, `--mono`…) so it matches
automatically; the fallbacks cover anywhere those aren't defined.

```html
<div id="gitwidget"></div>
<script src="https://cdn.jsdelivr.net/gh/abhibagaria/gitWidget@main/widget.js" defer></script>
```

Or, fully isolated (won't touch your page), drop in an iframe:

```html
<iframe src="https://abhibagaria.github.io/gitWidget/embed.html"
        style="width:100%;max-width:680px;height:200px;border:0" loading="lazy"></iframe>
```

## Run the fetch locally

```bash
GH_TOKEN=ghp_xxx GH_LOGIN=abhibagaria node scripts/fetch-contributions.mjs
```
