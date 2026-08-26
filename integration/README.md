# Integration — RFQ Analyser (Google Apps Script)

`transport_calc.gs` lets RFQ Analyser (Apps Script) fetch a transport price from
the **same data** the web calculator uses. It reads the published price table
`rates.json` from GitHub Pages and runs the identical calculation. (The module is
generic — it works in any Apps Script project, e.g. the catalogue too.)

The projects live in separate GitHub repos — that does not matter. The link is
the deployed URL `https://matiasbjerre-hub.github.io/Transport/rates.json`,
not the repo.

## Setup

1. In the RFQ Apps Script project: add the contents of `transport_calc.gs` as a
   new script file (and `clasp push`).
2. Call it from your catalogue code:

   ```js
   var r = calculateTransport('Hamburg', 'Copenhagen', 8, { currency: 'DKK' });
   if (r.ok) {
     Logger.log(r.total);         // e.g. 3861 (DKK, rounded)
     Logger.log(r.vehiclesText);  // "1 × Curtain van"
   }
   ```

   - Cities accept a name (`"Hamburg"`) or id (`"HAM"`).
   - Options: `{ currency: 'EUR'|'DKK'|'SEK', twoWays: true, m3: 16 }`.
     `m3` overrides pallets as `ceil(m3 / 2)`.
   - `twoWays: true` adds the return leg and a combined `total`.

## Result shape

```json
{
  "ok": true, "currency": "DKK", "from": "HAM", "to": "CPH", "pallets": 8,
  "oneWay": { "price": 517.5, "vehicles": { "Curtain van": 1 } },
  "vehiclesText": "1 × Curtain van",
  "totalEur": 517.5, "total": 3861, "totalExact": 3860.55
}
```

On error: `{ "ok": false, "error": "Price not available for this route" }`.

## Button — open the calculator from inside RFQ

`transport_button.gs` is the UI counterpart: it adds a **Transport** menu (and an
"Open transport calculator" button that opens the public web app in a modal
dialog) to the RFQ spreadsheet.

1. In the RFQ Apps Script project: add the contents of `transport_button.gs` as a
   new script file (and `clasp push`).
2. Reload the spreadsheet → a **Transport** menu appears.

> A project can have only one `onOpen()`. If RFQ already defines one, delete the
> `onOpen()` in `transport_button.gs` and call `addTransportMenu_()` from the
> existing `onOpen()` instead.

The button just opens the published, login-free app
(`https://matiasbjerre-hub.github.io/Transport/`) — no token or auth needed.

## Notes

- Prices come from `rates.json` and are cached for 1 hour (`CacheService`).
  Uploading a new sheet in the calculator updates `rates.json`, so the catalogue
  picks up new prices automatically (within the cache window).
- `FX` (currency rates) is read from `rates.json` (single source of truth,
  shared with the calculator); the constant here is only a fallback.
- Optional: deploy this script as a web app (`doGet`) to also expose a JSON API:
  `.../exec?from=HAM&to=CPH&pallets=8&currency=DKK&twoWays=1`.
