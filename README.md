# Særtransport-beregner (Rent.Group)

Selvstændig hjemmeside til at udregne transportomkostninger ved **særtransporter**
mellem byerne i et Umschlag (start: Københavns Umschlag).

## Sådan kører/redigerer du den

Ingen build, ingen server, ingen afhængigheder. Bare:

1. `git pull` på din laptop
2. Åbn `index.html` direkte i en browser (dobbeltklik)
3. Rediger samme fil i din editor og genindlæs browseren

## Sådan fortsætter du

Alt det du skal røre ved ligger øverst i `<script>` i `index.html`:

- **`CITIES`** — byerne i dropdownen. `{ id, name, umschlag }`. Sæt
  `umschlag: true` på de byer der indgår i Københavns Umschlag (markeres med
  ★ + farve). Pt. Umschlag = Berlin, Bocholt, Hannover, Hamborg. København er
  ikke selv en Umschlag-by — den deler Hamborgs umschlag.
- **`FX`** — valutakurser, `1 EUR = X`. Pt. `DKK: 7.46`, `SEK: 11.34`.
  Opdateres manuelt.
- **`RATES_EUR`** — pristabellen, **totalpris pr. tur i EUR** (kilde: Party
  Rent). Nøgleformat `"FRA-TIL"` med by-`id`'er. Værdien er et array med
  totalpriser for kolonnerne `[4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  "Full trailer"]`. Beløb omregnes til valgt valuta via `FX`.
- **`TRUCKS` / `TRAILER` / `MAX_PALLETS`** — lastbil-flåden (Liftbil 8,
  Lastbil 18, Lastbil 33), største læs pr. trailer (33) og maks. input.
- **`M3_PER_PALLET`** — m³ pr. palleplads (2). Udfyldes m³, beregnes
  pallepladser som `ceil(m³ / 2)`.

Pris- og lastbil-logik: læs ≤ 33 pallepladser = én bil; større læs fordeles på
flere (fulde trailere + mindste bil der rummer resten), og prisen lægges sammen.

Kilde for priserne: `Transport_Prices_Malmo_.xlsx`, ark **"offer"** (EUR).

## Næste skridt

- Berlin og Hannover er med i dropdownen (Umschlag), men har endnu ingen
  priser i listen — tilføj dem i `RATES_EUR` når de foreligger.
- Umschlag-model: Kbh. deler Hamborgs umschlag, så reelt betales kun
  Hamborg↔Kbh. for gods fra Umschlag-byerne. Kan bygges som en særskilt
  beregning senere.
- Verificér valutakurserne i `FX` mod de aktuelle.
