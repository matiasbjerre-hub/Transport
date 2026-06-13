# Særtransport-beregner (Rent.Group)

Selvstændig hjemmeside til at udregne transportomkostninger ved **særtransporter**
mellem lagrene i et Umschlag (start: Københavns Umschlag).

## Sådan kører/redigerer du den

Ingen build, ingen server, ingen afhængigheder. Bare:

1. `git pull` på din laptop
2. Åbn `index.html` direkte i en browser (dobbeltklik)
3. Rediger samme fil i din editor og genindlæs browseren

## Sådan fortsætter du

Alt det du skal røre ved ligger øverst i `<script>` i `index.html`:

- **`CITIES`** — byerne i dropdownen. Pt. København, Stockholm, Malmö,
  Göteborg (fra Börje Jonsson-prislisten). Tilføj flere ved at tilføje deres
  `id` + navn her.
- **`RATES`** — pristabellen, **pris pr. palle i DKK, 1 vej inkl. DMT**.
  Nøgleformat `"FRA-TIL"` med by-`id`'er. Værdien er et array med pris pr.
  palle for hvert palle-interval i `BRACKETS`-rækkefølgen
  (`1, 2, …, 8, "9-17", "18-29", "30-48"`). Samlet pris beregnes som
  pris pr. palle × antal paller. Kun ruter der findes i listen kan beregnes.
- **`BRACKETS` / `MAX_PALLETS`** — palle-intervallerne og det maksimale antal
  paller pr. transport (48).
- **`CURRENCY`** — valuta (pt. `DKK`).

Kilde for priserne: `Borje_Jonsson_Prislista_DKK__SEK.xlsx`, ark **"Prisliste DKK"**.

## Næste skridt

- Tilføj manglende ruter i `RATES` efterhånden som de bliver prissat
  (listen er pt. envejs for de ruter der findes i prislisten).
- Overvej en omregner til SEK (ark 1 i kilden) hvis det bliver relevant.
