# CLAUDE.md — Rent.Group Transport

Context and conventions for working on this repo (and how it connects to the
other two projects). Read this first.

## What this is

A standalone **transport cost calculator** — a single static page deployed to
GitHub Pages. It calculates transport prices between cities from a price table,
picks the vehicle, supports return trips, currency, and an in-browser price-sheet
upload that auto-commits and re-deploys.

- **Live site:** https://matiasbjerre-hub.github.io/Transport/
- **Repo:** `matiasbjerre-hub/Transport`
- **Working/default branch:** `claude/transport-repo-setup-ksz2ec`
  (the GitHub Pages deploy runs on push to this branch).

## The three projects

| Project | Where | Tech | My access |
|---|---|---|---|
| **Transport calculator** (this) | `matiasbjerre-hub/Transport` | Static HTML/JS on GitHub Pages | GitHub repo |
| **RFQ Analyser** ← integration target | `matiasbjerre-hub/RFQ` | Google Apps Script (VS Code + clasp) | GitHub repo |
| **Online catalogue** | `matiasbjerre-hub/catalogue` | Google Apps Script (VS Code + clasp) | GitHub repo |

The projects link at **runtime**, not via repos: the Apps Script projects fetch
this calculator's published `rates.json` over HTTPS. Repo separation is
irrelevant to that. **The transport price is integrated into RFQ Analyser.**

> Apps Script note: both RFQ and catalogue live in GitHub repos and are managed
> with `clasp` from VS Code. `clasp push`/`pull` needs Google OAuth
> (`clasp login`) — fine in a local VS Code session, not in a headless cloud one.

## Files

- `index.html` — the whole app (HTML + CSS + JS in one file).
- `rates.json` — **single source of truth** for prices and currency rates.
  Shape: `{ updated, source, fx, pcols, rates }`.
  - `fx`: `{ "EUR":1, "DKK":7.46, "SEK":11.34 }` (rates from EUR). Edit here only.
  - `pcols`: `[4,8,9,10,11,12,13,14,15,16,17,18,33]` (last = full trailer / 33).
  - `rates`: `{ "HAM-CPH": [13 prices in EUR], ... }` keyed `FROM-TO` by city id.
- `logo.png` — Rent.Group brandmark (white/gold), shown top-left on black header.
- `.github/workflows/deploy-pages.yml` — builds & deploys the site on push.
- `integration/transport_calc.gs` — Google Apps Script module for **RFQ
  Analyser** (works in any Apps Script project): fetches `rates.json` and runs
  the **identical** calc. Public function `calculateTransport(from, to, pallets, opts)`.
- `integration/README.md` — how to use the `.gs` module.
- `README.md` — user-facing overview.

## Domain model / calc logic (keep `index.html` and the `.gs` in sync)

- **Cities** (id → name): HAM Hamburg, BER Berlin, BOC Bocholt, HAN Hannover
  (these four are the **Copenhagen Umschlag** cities — shown first, ★, gold/red),
  then CPH Copenhagen, GOT Gothenburg, STO Stockholm, OSL Oslo, BRE Bremen,
  DOR Dortmund, FFM Frankfurt. **Malmö is intentionally excluded everywhere.**
- **Price source:** DDSJ 2026 international list, EUR, total price per transport.
- **Pallet → column:** ≤4→col0, ≤8→col1, 9–18→exact col, 19–33→full trailer.
- **Vehicles:** Van (≤4), Curtain van (≤8), **Truck 18p** (9–18),
  Full trailer (33). Loads >33 split into full trailers + smallest vehicle for
  the remainder; prices summed.
- **m³:** if given, pallets = `ceil(m³ / 2)` (one pallet place = 2 m³).
- **2-ways:** adds the return leg (`TO-FROM`) and shows a combined total.
- **Currency:** display in EUR/DKK/SEK via `fx`; **DKK is the default**.
- **Defaults:** origin Hamburg, destination Copenhagen.

## Upload feature (auto push + deploy)

Button under the vehicle line. Parses an uploaded DDSJ `.xlsx` in the browser
(SheetJS), updates prices live, then commits `rates.json` via the GitHub
Contents API using a **fine-grained token the user enters once** (stored only in
`localStorage`, never in code). Branch/target are in the `GH` constant in
`index.html`. The push triggers the Pages deploy. On a 401/403 the token is
cleared so the next upload re-prompts.

## Conventions

- No build, no framework, no dependencies (SheetJS is loaded from CDN at runtime).
- Keep everything in `index.html`; match the existing plain-ES5 style (`var`-free
  `const`/`let`, `function` expressions, no arrow-only patterns required).
- Commit on the working branch above, then **verify the deploy** (Actions →
  "Deploy to GitHub Pages" → success) before reporting done.
- The site is in **English**.
- If you change the calc logic, vehicle names, pcols or city ids, update BOTH
  `index.html` and `integration/transport_calc.gs`.

## Deploy / verify

Push to `claude/transport-repo-setup-ksz2ec` → the `deploy-pages.yml` workflow
publishes to Pages (~30–60 s). Confirm the run succeeded, then the change is live
at the URL above (hard-refresh to bypass cache).

---

## How to brief a NEW session

Copy–paste this:

> "Connect this session to my three repos: `matiasbjerre-hub/Transport`,
> `matiasbjerre-hub/RFQ`, and `matiasbjerre-hub/catalogue`. Read `CLAUDE.md` in
> the Transport repo first.
>
> RFQ Analyser and the catalogue are Google Apps Script projects I edit in VS
> Code with clasp (I'm logged in via `clasp login`, so `clasp push`/`pull` work).
> The Transport calculator is a static GitHub Pages site; work on branch
> `claude/transport-repo-setup-ksz2ec` and verify the Pages deploy after each push.
>
> Task: integrate the transport price into **RFQ Analyser**. Take
> `integration/transport_calc.gs` from the Transport repo, add it to the RFQ
> Apps Script project, commit it to `matiasbjerre-hub/RFQ` and `clasp push`. Then
> call `calculateTransport(from, to, pallets, { currency:'DKK', twoWays:false })`
> and show the returned `total` and `vehiclesText` in <the place in RFQ you want
> it>."

What a multi-repo session can then do that this one can't:
- Add/commit the `.gs` straight into the RFQ repo and `clasp push` it.
- Keep calc logic, `fx`, `pcols` and city ids in sync across all repos in one go.

What it still can't do: touch Apps Script code that exists **only** inside Google
(not mirrored to a GitHub repo). Mirror it with clasp first.
