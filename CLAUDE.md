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
    truth**: `{ items: { "<Art.Nr.>": { d: description, s: setupCostEUR, w:
    weightKg, v: volumeM3 } } }` (`w`/`v` re-added 2026-07-04 for the "Send to
    Transport" pallet calc — see that section below; not shown in the UI).
    Currently ~14,931 items — the original German "Master Datenbestand" plus 14
    local Scandinavian items (art. numbers starting `19`) copied in from the RFQ
    repo's `Varekatalog.js` `UI_PRODUCT_DATA` table (the only 14 of its 163
    entries not already covered by the German data — the other 149 overlap and
    were intentionally left alone to avoid downgrading rows that already have
    richer German-sourced data).
- **Page heading is "Subrental Assistant"** (changed from "Missing items from a
  stock export" on 2026-07-03 — if renaming again, that's the only place the
  old title lived, there's no other reference to update).
- **What it does:** upload a stock/availability export (`.xls`/`.xlsx`, same
  format as the Excel "Subrental" workflow) — **Order no. and the subrental
  period (from/to) fields are hidden until a file is uploaded** (`#orderFieldsRow`
  starts `display:none`, revealed by JS the moment a file is chosen, before
  parsing even finishes — this was deliberate on 2026-07-03: don't move it back
  to always-visible-up-front without checking, that's the second time the
  visibility of a section here has been tuned based on user feedback). Order
  no. auto-fills from the uploaded filename's longest digit run if it contains
  one (e.g. "Missing items order 2610293.xls" → "2610293" — still editable) →
  every row with `Missing stock > 0` is extracted (columns identified by header
  name: "Item number", "Description", "Missing stock") → **item numbers
  starting with `19` are excluded entirely** (local-warehouse-only articles —
  can never be subrented from elsewhere; this is different from the Master
  Datenbestand merge above, which is about looking up *description* data for
  19-prefix items, not about whether they're eligible for subrental at all) →
  shown as an on-screen preview table where **every field is editable per
  row**: Art.Nr. and Qty (added 2026-07-03 - plain `<input>`s, `id="itemNo_i"`
  / `id="qty_i"`), plus the existing Rental days field and **"Warehouse"
  dropdown** (`WAREHOUSE_OPTIONS`:
  Hamburg/Berlin/Bocholt/Hanover "Umschlag", Frankfurt/Munich "Direct" —
  per-row because different missing items may need to come from different
  warehouses, not a single order-level choice). Rental days defaults from the
  subrental period via the *internal* subrental scale (confirmed by the user
  2026-07-03): calendar days → whole weeks (rounded up) →
  `WEEK_TO_RENTAL_DAYS` lookup (1 week→1, 2→3, 3→7, 4→10, 5→14, 6→17, ... up to
  12→38; extrapolated beyond 12 weeks). **Not plain calendar days** —
  client-facing rentals use calendar days, subrental doesn't. Since the period
  fields are usually filled in *after* upload (see above), `refreshRentalDaysDefaults()`
  is wired to both date inputs' `input` event and overwrites every currently
  rendered row's Rental days box the moment the period changes — don't remove
  this or defaults will stay blank forever for anyone following the
  fields-appear-after-upload flow. Both Rental days and Warehouse are
  informational for the colleague booking the subrental — **not connected to
  pricing**, neither is required to download. → **"Download .xlsx"** produces
  a file (`Subrental_<order>_<from>_<to>.xlsx`) with Order no./period and the
  Art.Nr./Amount/Description/Rental days/Warehouse rows (reading the live,
  possibly-edited per-row values from the DOM at download time via
  `getRowsWithCurrentInputs()`) — meant to contain everything needed to submit
  the internal subrental request. "Copy as text" (tab-separated, same live
  values) is also available. No login; the page is fully public.
- **Editing Art.Nr. live-updates the Description, no page reload or "update"
  button** (added 2026-07-03, per explicit user request — they asked whether
  this was possible before falling back to an update button; it was, so no
  button was added). Mechanism: `datenbestand.json` is already loaded
  client-side into `DB` on page load, so an `input` listener on each
  `itemNo_i` box (`refreshRowDescription(i)`) just re-looks-up `DB.items[...]`
  and rewrites that row's `descCell_i` + toggles `flag-missing` on `row_i` —
  all synchronous, no fetch. This is **purely cosmetic**, though:
  `getRowsWithCurrentInputs()` (used by both Download and Copy) independently
  re-derives the description from the *current* Art.Nr. value every time it's
  called, rather than trusting whatever the cosmetic cell currently displays
  — so even if the live-update listener were ever removed or broken, the
  actual output would still be correct. Don't couple the two more tightly
  than that; the redundancy is deliberate cheap insurance, not an oversight.
- **No explanatory note box below the upload card** — removed on 2026-07-03 per
  explicit request (there used to be a `.note` div explaining the 19-prefix
  exclusion, Rental days scale, etc.; the CSS rule was deleted too since
  nothing uses it anymore). Don't re-add a wall of explanatory text there
  without checking — the user wants this page terse.
- **No Setup Cost / no cost calculation on this page** — removed on 2026-07-03
  per explicit correction: Setup Cost is an RFQ-tool concern only, not part of
  this workflow. `datenbestand.json` still stores the `s` (setup cost EUR)
  field (harmless, used by nothing here) purely because rebuilding the schema
  wasn't worth it — don't resurrect a Setup Cost UI here without checking with
  the user first, it was deliberately taken out, twice now (added, then found
  overscoped).
- **Item flagging:** any item still not found in `datenbestand.json` (after the
  19-prefix exclusion above) is flagged in red — its description falls back to
  whatever the stock export itself had. Purely informational now that there's
  no cost calc riding on it.
- **Updating the master data:** a "Refresh the item master data" section,
  collapsed by default behind a `<details class="admin">`/`<summary>` with a
  circular **"+" icon** (rotates to look like "×" when open via CSS
  `details.admin[open] summary .plus-icon { transform: rotate(45deg) }` — no
  JS needed, native `<details>` toggle). History: started collapsed with plain
  text (too easy to miss) → made always-visible (took up permanent space) →
  settled on collapsed-with-a-clear-icon on 2026-07-03 as the balance the user
  wanted. Keep the plus-icon affordance if touching this again — don't revert
  to either previous version without checking. The descriptive paragraph
  inside was also cut down on 2026-07-03 from a detailed column-by-column
  breakdown to a single line ("Upload an updated product list (Master
  Datenbestand) here:") — the detail wasn't wanted, keep it terse if editing.
  Has its own upload button — same auto-commit-via-GitHub-API pattern as the
  Transport price-sheet upload below (own PAT prompt, own `localStorage` key is
  shared since it's the same `gh_token` — same repo, same permissions needed).
  Rebuilds `subrental/datenbestand.json` from an uploaded Master Datenbestand
  `.xlsx` (columns identified by header name: "Item number", "Description" —
  "Setup cost €" is parsed if present but optional, not required).
- **Download fills the REAL internal template** (`subrental/template.xlsx`),
  implemented 2026-08-05 — supersedes the earlier plain-`aoa_to_sheet` version
  and an even earlier note here (now wrong) claiming K/L had been removed from
  the Excel template. The real source file is
  `.../Quote Flow/Skabelon til Claude Code.xlsx` on OneDrive.
  - **Why not SheetJS's `XLSX.write()`:** tested empirically — a plain
    `XLSX.read()` → `XLSX.write()` round-trip **drops font formatting**
    (verified: a bold header cell came back non-bold) even with
    `cellStyles:true`. Full style *writing* is a SheetJS Pro-only feature;
    Community only writes number formats reliably. Since colleagues actually
    submit this file, that's not acceptable.
  - **What we do instead:** direct XML surgery on `xl/worksheets/sheet1.xml`
    inside the .xlsx zip (via JSZip, loaded from cdnjs — see the `<script>`
    tag next to the SheetJS one). Every cell we fill in already exists in the
    template as a style-only empty tag (e.g. `<c r="A12" s="52" t="n" />`); we
    regex-match the exact `<c r="ADDR" ...>` element and rewrite only its
    value, preserving its `s=` style attribute byte-for-byte. Nothing else in
    the file is touched — this guarantees existing formatting/formulas survive
    exactly. The functions (`setCell`, `renumberRow`, `fillSubrentalSheet`,
    etc.) live in `subrental/index.html` right above `downloadWorkbook()`; they
    were prototyped and verified in isolation (Node + JSZip + openpyxl, several
    item counts) before being ported in — see the reasoning comment above them
    in the code for the exact cell mapping.
  - **`template.xlsx` is a STRIPPED copy, not the real file verbatim.** The
    real file's hidden "Datenbestand" sheet is the **entire Group master
    catalog** (~15,000 rows: `Mietpreis`/rental price, `Reinigung`/cleaning
    cost, `Aufbau`/setup cost, weight, volume, multi-language names) — shipping
    it would publish the Group's internal pricing on this fully public,
    unauthenticated site. The shipped copy has **Datenbestand and
    Dokumentation (internal staff names/changelog) removed entirely**, plus
    scrubbed `docProps` (no SharePoint path, no employee names in
    creator/lastModifiedBy). Only `Calculation` + `Others` sheets remain.
  - **K/L (Weight/Volume) VLOOKUP formulas were cleared** in the shipped copy
    (they referenced the now-removed Datenbestand sheet). The app computes the
    same values itself — `DB.items[x].w` (kg) and `.v` (m³), already loaded
    client-side from `datenbestand.json` — and writes them in as plain numbers
    (`qty × w`, `qty × v`), matching what the original formula computed.
  - **Field mapping** (Calculation sheet): `C4` = Order no. **only** (the
    template's default value here was the literal text `"CPH "`; explicit user
    decision 2026-08-05 was to overwrite it with just the order number, not
    prefix/append it — the destination-is-always-Copenhagen convention isn't
    encoded in this cell). `C5`/`C6` = subrental period from/to, written as
    Excel serial dates (`excelSerialDate()` — epoch Dec 30 1899, verified
    against the known reference 2020-01-01 → 43831). Item rows: `A`=Art.Nr.,
    `B`=Amount, `C`=Description, `H`=Rental days, `I`=Location (must exactly
    match one of the `Others` sheet's 6 warehouse strings, which are the same
    6 values as `WAREHOUSE_OPTIONS` — already guaranteed by construction).
    `D` (Price), `E` (Discount), `F` (Total), `J` (Rental factor), `M` (Setup
    Cost) are left alone — no pricing on this page, matches the long-standing
    scope decision below.
  - **Row capacity and auto-extension:** the template only has 17 pre-built
    item rows (12–28), row 28 uniquely carrying the table's bottom border,
    row 29 the Total. Explicit user decision 2026-08-05, given the choice
    between capping at 17 with a warning vs. auto-extending: **auto-extend**.
    When there are more than 17 items, the code clones row 27's plain "middle"
    style for every additional row, moves the bordered "last row" style
    (cloned from the original row 28) to whichever row is now actually last,
    and moves the Total row + its `SUM(...)` ranges + the `C29:D29` merge down
    to match. Verified for K=1, 17 (boundary, no change), 18 (minimal
    extension), and 20 items — all structurally correct via openpyxl
    (values, formulas, merges, borders, dimension). Capped at 60 items
    (`SUBRENTAL_MAX_ITEMS`) — throws a clear error rather than silently
    mis-rendering; not expected to be hit in practice.
  - **If the real template's layout ever changes** (fields move, row range
    changes, more/fewer warehouses), this entire mapping needs re-deriving
    from the actual file — don't guess from this doc, re-inspect the real
    `.xlsx` (e.g. with openpyxl: dump every non-empty cell + merged ranges +
    the raw `xl/worksheets/sheet1.xml` for the row range in question) the same
    way this was built.
- **Not ported:** Price/Discount/Total (D/E/F) from the Excel template. The
  rental-days *factor* formula (J: `weeks===2 ? 1.25 : weeks>2 ? (RD-2)*0.15+1.25
  : RD`) is documented as a comment next to `WEEK_TO_RENTAL_DAYS` in
  `index.html` (verified it reproduces the user's confirmed factors exactly)
  but **not surfaced anywhere in the UI** - there's no cost calc on this page.
  If a "Rental factor" column is wanted later, the formula is already there,
  just needs wiring up. Setup Cost (M) was added then explicitly removed —
  see above. Ask before assuming any of these should be (re-)added.
- **"AGP" terminology (2026-07-03):** the stock/availability export the user
  uploads comes from a system they call "AGP" (tab 4, "Items"). The intro
  paragraph and upload button both reference this by name now ("Export the
  contents of 'Items' (Tab 4) in AGP and upload it here." / "Upload AGP export
  file (.xlsx)") — this isn't explained anywhere in this doc beyond what the
  user told me; if AGP's export format ever changes, the column-header-based
  parsing (`Item number`/`Description`/`Missing stock`) is what actually needs
  to keep matching, not the button text.
- **"Advanced settings" (2026-07-03):** the collapsed summary here was named
  **"Advanced settings"**, styled smaller and grey (`font-size: 0.8rem`,
  `color: var(--muted)`). The Transport calculator's `#uploadBtn` was also
  temporarily named "Advanced settings" the same day, but was **renamed again
  to "Update price list" on 2026-07-04** (per explicit user request). The
  Subrental summary text stays "Advanced settings"; only Transport's button
  changed. In Transport, the override is scoped to `#uploadBtn` specifically
  (`#uploadBtn { font-size: 0.8rem; color: var(--muted); }`) rather than
  touching the shared `.toggle` class, since that class is reused by every
  button on the page (Calculate, 2-ways, Add to list) and must stay at normal
  size/weight.

## Four-app hub (`hub/`) — one URL, all four apps as tabs (2026-07-05)

`hub/index.html` is the unified entry point everyone shares:
**https://matiasbjerre-hub.github.io/Transport/hub/**. It's a single static file:
a slim top bar (logo + 4 pill tabs) over one full-height `<iframe>` that swaps
per tab, with `#hash` routing (`#transport`/`#subrental`/`#catalogue`/`#rfq`) so
tabs are bookmarkable and the back button works. The iframe only reloads when the
tab actually changes (`data-key` guard).

- **Routing/paths** (`ROUTES` in `hub/index.html`): Transport `../`, Subrental
  `../subrental/`, Catalogue `../../catalogue/` — all same-origin on
  `matiasbjerre-hub.github.io`, so they embed with zero X-Frame/cookie issues.
  RFQ is the absolute Apps Script `/exec` URL; it embeds because RFQ is now
  **anonymous** (see RFQ repo's CLAUDE.md) — that removed the third-party-cookie
  grey-box problem, so it no longer needs an "open in new tab" exception. If the
  RFQ `/exec` deployment id ever changes, update it here too.
- **Embedded apps hide their own chrome:** Transport and Subrental add
  `html.embedded { ... }` CSS + a one-line `if (window.top !== window.self)`
  script (just before `</head>`) that hides their own `header` + `nav.tabs` when
  framed, so you don't get a double header. Standalone pages are unchanged. The
  Catalogue keeps its own header (not worth a re-bundle for v1).
- **"Send to Transport" stays inside the hub:** Subrental's link carries
  `data-legs`/`data-to` + `onclick="return hubSendToTransport(event, this)"`.
  When framed it `postMessage`s `{type:"rg:legs",legs,to}` to the hub (same-origin
  check both ends); the hub switches to the Transport tab and loads
  `../?legs=…&to=CPH`, which Transport's `applyLegsParam` reads. Standalone it
  falls back to the existing `target="_blank"` link. (Note `applyLegsParam` uses
  the global `twoWays` default = round trip.)
- Verified in preview: all 4 tabs switch, RFQ renders its passcode gate embedded
  with no Google login, embedded Transport/Subrental have no double header, and
  the Send-to-Transport handoff populates the cart in the Transport tab.

## Landing page (`start/`) — the link you hand to a colleague (2026-08-23)

`start/index.html` is a static landing page listing the **live** Rent.Group web
apps: **https://matiasbjerre-hub.github.io/Transport/start/**. Three cards —
the four-app Hub (`../hub/`, one link; the four apps are named as chips on the
card rather than as four separate links, which was an explicit user decision),
**AGP-Assistent** (`https://hopper-vaerktoej-7319.vercel.app`, the
`matiasbjerre-hub/AGP-Assistent` repo — automates umschlag dates, missing-item
warehouse routing, and Subrental-sheet filling for AG&P quotes; added
2026-09-02 after being found via `gh repo list`. No login wall observed when
this card was added, despite an earlier memory claiming Vercel Authentication
restricted it to Matias' account — re-check before assuming either way if
this matters again), and the **Production Planner**
(`https://production-planner-sigma.vercel.app`, the
`matiasbjerre-hub/production-planner` repo — a private Next.js app on Vercel,
password-gated via `APP_PASSWORD`, hence the "Password required" chip).

`3D-til-AGP` (`matiasbjerre-hub/3D-til-AGP`) has a **fourth card, but as a
placeholder** (`.app.placeholder`, a `<div>` not an `<a>` — no href, since
there's nowhere to send anyone yet): as of 2026-09-02 it's a written plan only
(`PLAN.md`), nothing built. The placeholder uses a dashed border, no red
top-rule (`::before { content: none }`), no hover lift, and a dashed
"In development" chip (`.chip.status`) instead of the usual `.url` line's real
address. **When this repo goes live, swap the `<div class="app placeholder">`
for an `<a class="app">` with its real `href`/`target`/`rel`**, drop the
`placeholder` class and the status chip, and update the `.url` line — the
`.placeholder`/`.chip.status` CSS can stay in the stylesheet for the next one
of these. Note the plan itself recommends a local Python script over a web
app, so this may end up needing a different kind of card entirely (e.g. "runs
locally") rather than a live link — re-check `PLAN.md` before wiring up an
href.

- **Same no-build pattern as everything else here:** one self-contained file,
  Montserrat + IBM Plex Mono from Google Fonts, no framework, no dependencies.
  Deployed by the existing `deploy-pages.yml` (whole repo root), so it needed no
  workflow change.
- **Logo is `../logo.png`** — the same file the hub uses, referenced relatively.
  (A separate copy of this page exists as a Claude artifact where the logo is
  inlined as a data URI, because artifacts block remote images. If you change
  the page here, that copy does not follow automatically.)
- **Deliberately single-theme** (brand black, white cards, `#c8102e`) — it does
  not react to `prefers-color-scheme`, matching the rest of the site.
- **The page is in English**, per the site-wide convention below.
- **Personal apps are NOT listed here** and shouldn't be added: Piano-app and
  Artist Search live on a separate landing page kept fully apart from
  Rent.Group, per explicit user instruction.

## Tab navigation between Transport and Subrental

Both pages now share a small pill-style tab bar right below the header logo
(`nav.tabs`, added 2026-07-03 per explicit user request — the "simple nav bar"
option from two proposed: this one page-reloads on switch but needed no
namespacing work; the alternative, in-memory single-page tabs, was rejected
since both apps define same-named globals like `GH`/`getToken`/`setStatus`
and would need factoring first).

- **Markup:** `<nav class="tabs"><a href="...">Transport</a><a href="...">Subrental</a></nav>`,
  with `class="active"` on whichever link matches the current page.
- **Paths are relative, not absolute** — from `index.html`: `href="./"`
  (self/active) and `href="subrental/"`; from `subrental/index.html`:
  `href="../"` and `href="./"` (self/active). Keep them relative if the repo
  or Pages URL ever changes.
- **CSS is duplicated in both files** (`nav.tabs`, `nav.tabs a`, `nav.tabs
  a.active` — identical block in each `<style>`). There's no shared stylesheet
  between the two pages (single-file-per-page is the whole point of this
  no-build setup), so if the tab style needs to change, update it in **both**
  `index.html` and `subrental/index.html` or they'll drift.
- Switching tabs does a real page navigation (full reload) — this was an
  accepted tradeoff, not an oversight.

## "Send to Transport" — Subrental → Transport handoff (2026-07-04)

Lets a colleague jump from a Subrental Assistant result straight into the
Transport calculator with the right route (and, since the user asked for it,
pallet count) pre-filled, without losing their place in Subrental.

- **Mechanism: URL query params, read on load.** Transport reads two handoff
  formats via IIFE blocks right after the `CITIES`/select setup:
  - **Single route** (`applyQueryParams`): `?from=HAM&to=CPH&pallets=3` — sets
    the origin/destination/pallet fields. Still used for any direct link outside
    of Subrental.
  - **Multi-leg** (`applyLegsParam`, added 2026-07-04): `?legs=HAM:5,BOC:1,FFM:3&to=CPH`
    — one leg per warehouse group, all going to the same destination (`CPH` by
    default). Each `CITY:PALLETS` pair is parsed, computed via the internal
    `computeLeg()` helper, and pushed straight into Transport's existing cart
    (`cart.push(r)` + `renderCart()`), so the user arrives with all legs already
    added and a combined total visible. The last valid leg is also mirrored into
    the live single-route form. Unknown cities and zero/invalid pallets are
    silently skipped. `computeLeg()` was split out from `computeTransport()` for
    exactly this: it takes explicit `(from, to, pallets, twoWaysFlag)` args and
    does not touch the DOM, so it's safe to call in bulk without disturbing the
    visible form.
- **Subrental side (updated 2026-07-04):** `refreshTransportLinks()` used to
  generate **one link per warehouse group**. It now generates a **single combined
  link** covering all warehouses at once (`legs=CITY:PALLETS,...&to=CPH`), since
  the user explicitly asked for all products to open in one Transport tab where
  multiple transports can be added. The link label shows the combined item count
  and a per-city breakdown, e.g. "→ Transport: all 5 items (Hamburg (3), Bocholt
  (2))". Still `target="_blank"`. Recomputed on every Art.Nr./Qty/Warehouse edit.
- **Pallets are computed from Weight/Volume, which is back in `datenbestand.json`
  but deliberately not shown anywhere in the UI** — the user explicitly asked
  for auto-calculated pallets while keeping the underlying data hidden, only
  used internally for this feature. `datenbestand.json` items are now
  `{d, s, w, v}` (`w` = weight in **kg**, `v` = volume in **m³** — Setup Cost
  `s` from before is unaffected). Per warehouse group: `volume = Σ(qty × v)`
  across its rows, `pallets = ceil(volume / 2)` (same `M3_PER_PALLET = 2` as
  Transport). If total volume comes out to 0 (item not found, or genuinely
  zero volume on every row in the group), `pallets` is omitted from the URL
  entirely rather than passing `pallets=0` — Transport then just uses its own
  default (1).
- **Munich was added to Transport specifically for this** (it wasn't a
  Transport city before) — `WAREHOUSE_OPTIONS` in Subrental already had
  "Munich - Direct" with nothing to send it to. Per explicit user decision:
  Munich (`MUC`) mirrors Frankfurt's (`FFM`) price list exactly (no real DDSJ
  data for Munich exists) — all 4 Frankfurt routes (`CPH-FFM`, `FFM-CPH`,
  `FFM-STO`, `STO-FFM`) have an identical `MUC` counterpart. **Two places had
  to be updated, not one:** `RATES_EUR` in `index.html` (the fallback, used
  before `rates.json` loads or if it fails) **and** `rates.json` itself, since
  `rates.json` — once fetched — fully replaces the `RATES` in-memory object
  (see "Upload feature" above). Forgetting `rates.json` here silently breaks
  Munich in production even though the code and fallback both look correct —
  this exact mistake was made and caught during testing before deploying.
  If Munich ever gets real price data, replace both copies, not just one.
- **Data source correction (2026-07-04):** this feature required rebuilding
  `datenbestand.json` from the real Master Datenbestand, and the file
  previously used for that (a `~/Downloads` copy from 2026-07-02) turned out
  to be stale — the user pointed to the actual current file in OneDrive
  instead. Re-verify against OneDrive if `datenbestand.json` needs rebuilding
  again; don't assume a local cached copy is current.
- **OneDrive access was blocked across this entire session** (the same issue
  noted elsewhere in this file) until the user changed a "Full Disk Access"
  (Danish: "Fuld adgang") permission in macOS System Settings for the relevant
  app — worth suggesting early if this recurs, rather than just retrying reads.
  Oddly, a `timeout N cat <file>` via the Bash tool still reported failure
  afterward while a plain Python `open(...).read()` succeeded instantly on the
  same path — if OneDrive access seems stuck, try a direct Python read before
  concluding it's still broken.

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
- **2-ways:** adds the return leg (`TO-FROM`) and shows a combined total. The
  vehicle count is **not** doubled for round trips (fixed 2026-07-04 — previous
  code used `mergeVehicles(out.vehicles, ret.vehicles)` which summed both legs,
  always doubling since both legs need the same pallet count / same vehicle. The
  fix uses `out.vehicles` directly. `mergeVehicles` was removed entirely since it
  had no other callers). The price still sums both legs correctly.
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

## Prompt template — link a newly-built app from a landing page (2026-09-02)

Matias builds new apps in their own, separate repos/sessions that have no
access to this conversation or this file. When one of those apps goes live, he
pastes the template below into that session so it adds its own card — it does
not describe the current page state (card count, which apps exist today), only
the two pages' fixed coordinates, so it doesn't go stale as more cards get
added or removed.

> "Add a card for the app built in this session to one of my two landing
> pages:
>
> 1. **Rent.Group Tools** (work apps) — English. Repo
>    `matiasbjerre-hub/Transport`, file `start/index.html`, branch
>    `claude/transport-repo-setup-ksz2ec` (not `main`). Live:
>    https://matiasbjerre-hub.github.io/Transport/start/
> 2. **Matias' Web Apps** (personal apps) — Danish. Repo
>    `matiasbjerre-hub/klaver-og-scene`, file `index.html`, branch `main`.
>    Live: https://matiasbjerre-hub.github.io/klaver-og-scene/
>
> Pick whichever fits; ask me if it's genuinely unclear whether this app is
> work or personal.
>
> Steps:
> 1. If the target repo isn't already cloned under `~/Documents/GitHub/<repo>`,
>    clone it (`gh` is already authenticated as `matiasbjerre-hub`).
> 2. Run `git status` first. Don't touch or commit any other pending/uncommitted
>    changes you find — stage only the file you edit.
> 3. Confirm the new app's live URL actually responds (curl for a 200) before
>    linking to it.
> 4. Check whether a placeholder card for this app already exists (dashed
>    border, an 'In development' chip instead of a real address) — if so,
>    convert that card into a real link instead of adding a new one.
> 5. Copy an existing card's HTML structure exactly rather than inventing new
>    markup, and change nothing else on the page. Match the page's own
>    language (English for Rent.Group Tools, Danish for Matias' Web Apps) —
>    not necessarily the app's own language.
> 6. Commit, push to the branch named above, wait ~30-60s for the GitHub Pages
>    rebuild, then curl the live page to confirm the new card is actually
>    there before reporting done.
> 7. Show me the final landing-page URL."
