# Integration — Online catalogue (Google Apps Script)

`transport_calc.gs` lets the Online catalogue (Apps Script) fetch a transport
price from the **same data** the web calculator uses. It reads the published
price table `rates.json` from GitHub Pages and runs the identical calculation.

The two projects live in separate GitHub repos — that does not matter. The link
is the deployed URL `https://matiasbjerre-hub.github.io/Transport/rates.json`,
not the repo.

## Setup

1. In the catalogue's Apps Script project: **+ → Script**, paste the contents of
   `transport_calc.gs`.
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

## Notes

- Prices come from `rates.json` and are cached for 1 hour (`CacheService`).
  Uploading a new sheet in the calculator updates `rates.json`, so the catalogue
  picks up new prices automatically (within the cache window).
- `FX` (currency rates) is read from `rates.json` (single source of truth,
  shared with the calculator); the constant here is only a fallback.
- Optional: deploy this script as a web app (`doGet`) to also expose a JSON API:
  `.../exec?from=HAM&to=CPH&pallets=8&currency=DKK&twoWays=1`.
