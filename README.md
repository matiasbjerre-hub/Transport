# Transport Cost Calculator (Rent.Group)

A standalone web page that calculates transport costs between cities, based on
the **DDSJ 2026 international price list**.

## Run / edit

No build, no server, no dependencies:

1. `git pull`
2. Open `index.html` directly in a browser (double-click)
3. Edit the same file in your editor and reload the browser

The live version is deployed automatically to GitHub Pages on every push:
**https://matiasbjerre-hub.github.io/Transport/**

## What you can edit

Everything lives at the top of `<script>` in `index.html`:

- **`CITIES`** — the dropdown cities. `{ id, name, umschlag }`. Set
  `umschlag: true` to mark a Copenhagen Umschlag city (shown with ★ + colour).
  Currently: Hamburg, Berlin, Bocholt, Hannover.
- **`FX`** — exchange rates, `1 EUR = X`. The single source is `rates.json`
  (`fx` key), shared with the catalogue integration; the value in `index.html`
  is only a fallback. The currency selector (EUR/DKK/SEK) converts via `FX`.
- **`RATES_EUR`** — the price table, **total price per transport in EUR**.
  Key `"FROM-TO"` with city ids; value is an array of prices for the columns
  `PCOLS = [4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 33]` (last = full
  trailer).
- **`PCOLS` / `FULL_TRAILER` / `MAX_PALLETS`** — pallet columns, full-trailer
  size (33) and the maximum input.
- **`M3_PER_PALLET`** — m³ per pallet place (2). When m³ is entered, pallets are
  derived as `ceil(m³ / 2)`.

## Behaviour

- **Source:** DDSJ 2026 international list only. **All routes via Malmö are
  excluded.**
- **Vehicle** is chosen from the pallet count: Van (≤4), Curtain van (≤8),
  Truck 18p (9–18), Full trailer (33). Loads above 33 pallets are split across
  several vehicles (full trailers + the smallest vehicle for the remainder) and
  the prices are summed.
- **2-ways** button: adds the return leg (destination → origin) and shows a
  total for both directions.
- The page is in English.

## Next steps

- Add prices for any missing routes/cities in `RATES_EUR` as they become
  available.
- Verify the exchange rates in `FX` against current rates.

## Subrental calculator (`subrental/`)

A second standalone page in this repo: upload a stock/availability export and
get the missing items (Missing stock > 0) with Setup Cost converted to DKK.

**Live:** https://matiasbjerre-hub.github.io/Transport/subrental/

See `CLAUDE.md` → "Subrental calculator" for the full details (data model,
upload behaviour, what's deliberately not ported from the Excel version yet).
