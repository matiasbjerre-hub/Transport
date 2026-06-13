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

- **`WAREHOUSES`** — lagrene i dropdownen. Pt. Københavns Umschlag:
  København, Berlin, Bocholt, Hannover, Hamborg. Tilføj flere Umschläge ved
  at tilføje deres lagre her.
- **`RATES`** — pristabellen. Tom indtil prislisterne er klar. Nøgleformat
  `"FRA-TIL"` med lager-`id`'er, fx `"CPH-BER": 850`. Beregningen aktiveres
  automatisk når en pris findes for den valgte rute.
- **`CURRENCY`** — valuta (pt. `EUR`).

## Næste skridt (når prislisterne uploades)

- Indlæs priserne i `RATES` (evt. begge retninger).
- Overvej om prisen afhænger af mængde/volumen/vægt eller er en fast rute-pris —
  så kan datamodellen udvides derefter.
