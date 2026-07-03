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

## Subrental calculator (`subrental/`)

A second, independent static page in this same repo (the Pages workflow deploys
the whole repo root, so it needs no separate setup). Same no-build/no-framework
pattern as the Transport calculator above.

- **Live site:** https://matiasbjerre-hub.github.io/Transport/subrental/
- **Files:**
  - `subrental/index.html` — the whole app (HTML + CSS + JS in one file).
  - `subrental/datenbestand.json` — item master data, **single source of
    truth**: `{ items: { "<Art.Nr.>": { d: description, s: setupCostEUR } } }`.
    Currently ~14,931 items — the original German "Master Datenbestand" plus 14
    local Scandinavian items (art. numbers starting `19`) copied in from the RFQ
    repo's `Varekatalog.js` `UI_PRODUCT_DATA` table (the only 14 of its 163
    entries not already covered by the German data — the other 149 overlap and
    were intentionally left alone to avoid downgrading rows that already have
    richer German-sourced data).
- **What it does:** upload a stock/availability export (`.xls`/`.xlsx`, same
  format as the Excel "Subrental" workflow) → every row with `Missing stock > 0`
  is extracted (columns identified by header name: "Item number", "Description",
  "Missing stock") → Setup Cost is looked up per item and converted to DKK
  (`qty × Setup cost € × 7.46038`, the fixed EUR/DKK peg rate) → results shown
  as an on-screen table with a "Copy as text" button (tab-separated, pastes into
  Excel/email). No login; the page is fully public.
- **Item flagging:** item numbers starting with `19` that aren't in
  `datenbestand.json` are local items expected to be absent — shown with an
  amber note, Setup Cost 0, not treated as an error. Any other item not found is
  flagged in red as a genuine data gap. A field value of `0` in the data is
  always valid and never triggers a flag by itself — only "item not found at
  all" does.
- **Updating the master data:** the collapsed "Update master data" section has
  its own upload button — same auto-commit-via-GitHub-API pattern as the
  Transport price-sheet upload below (own PAT prompt, own `localStorage` key is
  shared since it's the same `gh_token` — same repo, same permissions needed).
  Rebuilds `subrental/datenbestand.json` from an uploaded Master Datenbestand
  `.xlsx` (columns identified by header name: "Item number", "Description",
  "Setup cost €").
- **Not ported (yet):** Price/Discount/Total (D/E/F), Weight/Volume (K/L), and
  the rental-days factor (H/J) from the Excel template — this page only
  replicates the Setup Cost (M) column and the missing-items extraction. Ask
  before assuming these should be added; they weren't part of the original
  scope.

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

## Giving a session access to all three repos

Two separate layers control repo access — don't confuse them:

1. **GitHub App permission (what Claude *may* touch).** Set on github.com under
   **Settings → Applications → Installed GitHub Apps → Claude → Configure →
   Repository access**. This is already on **All repositories**, so the app is
   allowed to reach every repo, including future ones. Nothing to change here.
2. **Session / environment scope (what *this* session actually sees).** Each
   Claude Code on the web session is bound to one **Environment**, and the
   environment decides which repos are in scope. A session scoped only to
   `Transport` cannot read/write `RFQ` or `catalogue` even though the app has
   "All repositories" — by design.

So if a session only sees `Transport`, the fix is **not** on github.com — it's
the environment. To work across all three:

- In Claude Code on the web → **Environments**, create or edit an environment
  whose source/scope covers all three repos (`Transport`, `RFQ`, `catalogue`).
- Start the new session in that environment, then paste the brief below.
- Docs: https://code.claude.com/docs/en/claude-code-on-the-web

Reminder: even with all three in scope, `clasp push`/`pull` for `RFQ` and
`catalogue` needs interactive `clasp login` (Google OAuth) and must run locally
in VS Code — a headless cloud session can commit the `.gs` to GitHub but cannot
sync it to Google Apps Script.

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
