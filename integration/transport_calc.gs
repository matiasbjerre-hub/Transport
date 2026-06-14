/**
 * Rent.Group Transport cost — Google Apps Script integration module.
 *
 * Lets the Online catalogue (Apps Script) fetch a transport price from the
 * same data the web calculator uses. It reads the published price table
 * (rates.json on GitHub Pages) and runs the identical calculation logic.
 *
 * Paste this file into the catalogue's Apps Script project, then call:
 *
 *   var r = calculateTransport('Hamburg', 'Copenhagen', 8, { currency: 'DKK' });
 *   // r.total            -> number in the chosen currency (rounded)
 *   // r.oneWay.price     -> outbound price (EUR)
 *   // r.vehiclesText     -> "1 × Curtain van"
 *
 *   var rt = calculateTransport('HAM', 'CPH', 40, { currency: 'EUR', twoWays: true });
 *   // rt.total includes both directions; rt.return holds the return leg.
 *
 * You can also pass volume instead of pallets: { m3: 16 } -> ceil(16/2) = 8 pallets.
 */

// Where the live price table is published (same file the calculator uses).
var RATES_URL = 'https://matiasbjerre-hub.github.io/Transport/rates.json';

// Pallet columns in the price table. Last entry = full trailer (33 pallets).
var PCOLS = [4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 33];
var FULL_TRAILER = 33;
var M3_PER_PALLET = 2;

// Exchange rates from EUR — loaded from rates.json; this is only a fallback.
var FX_FALLBACK = { EUR: 1, DKK: 7.46, SEK: 11.34 };

// City name -> id (so callers may pass either "Hamburg" or "HAM").
var NAME_TO_ID = {
  'Hamburg': 'HAM', 'Berlin': 'BER', 'Bocholt': 'BOC', 'Hannover': 'HAN',
  'Copenhagen': 'CPH', 'Gothenburg': 'GOT', 'Stockholm': 'STO', 'Oslo': 'OSL',
  'Bremen': 'BRE', 'Dortmund': 'DOR', 'Frankfurt': 'FFM'
};

/**
 * Fetch the price table, cached for 1 hour to avoid refetching every call.
 * @return {{pcols:Array, rates:Object}}
 */
function getRates_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('transport_rates');
  if (cached) return JSON.parse(cached);
  var resp = UrlFetchApp.fetch(RATES_URL, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('Could not load rates.json (HTTP ' + resp.getResponseCode() + ')');
  }
  var data = JSON.parse(resp.getContentText());
  cache.put('transport_rates', JSON.stringify(data), 3600); // 1 hour
  return data;
}

function resolveCity_(c) {
  if (!c) return null;
  c = String(c).trim();
  if (NAME_TO_ID[c]) return NAME_TO_ID[c];      // a full name
  c = c.toUpperCase();
  // already an id?
  for (var name in NAME_TO_ID) { if (NAME_TO_ID[name] === c) return c; }
  return null;
}

function colIndex_(n) {
  if (n <= 4) return 0;
  if (n <= 8) return 1;
  if (n <= 18) return n - 7;   // 9..18 -> 2..11
  return 12;                   // 19..33 -> full trailer
}

function vehicleName_(idx) {
  if (idx === 0) return 'Van';
  if (idx === 1) return 'Curtain van';
  if (idx === 12) return 'Full trailer (33 pallets)';
  return 'Truck 18p';
}

/** Price (EUR) + vehicle breakdown for one leg. */
function legFor_(rateArr, n) {
  var price = 0, veh = {};
  var full = Math.floor(n / FULL_TRAILER);
  var rem = n;
  if (full > 0) {
    price += full * rateArr[12];
    veh['Full trailer (33 pallets)'] = full;
    rem = n - full * FULL_TRAILER;
  }
  if (rem > 0) {
    var idx = colIndex_(rem);
    price += rateArr[idx];
    var nm = vehicleName_(idx);
    veh[nm] = (veh[nm] || 0) + 1;
  }
  return { price: price, vehicles: veh };
}

function vehiclesText_(veh) {
  return Object.keys(veh).map(function (k) { return veh[k] + ' × ' + k; }).join(' + ');
}

/**
 * Calculate a transport price.
 * @param {string} from  origin city name or id (e.g. "Hamburg" or "HAM")
 * @param {string} to    destination city name or id
 * @param {number} pallets  number of pallets (ignored if opts.m3 is given)
 * @param {Object} [opts]  { currency: 'EUR'|'DKK'|'SEK', twoWays: bool, m3: number }
 * @return {Object} result with ok/total/oneWay/return/vehiclesText/etc.
 */
function calculateTransport(from, to, pallets, opts) {
  opts = opts || {};
  var currency = (opts.currency || 'DKK').toUpperCase();

  var oid = resolveCity_(from), did = resolveCity_(to);
  if (!oid || !did) return { ok: false, error: 'Unknown city' };
  if (oid === did) return { ok: false, error: 'Origin and destination are the same' };

  if (opts.m3 != null && opts.m3 !== '') {
    pallets = Math.ceil(Number(opts.m3) / M3_PER_PALLET);
  }
  pallets = parseInt(pallets, 10);
  if (!pallets || pallets < 1) return { ok: false, error: 'Invalid pallet count' };

  var data = getRates_();
  var fxTable = data.fx || FX_FALLBACK;
  var fx = fxTable[currency] || 1;
  var outArr = data.rates[oid + '-' + did];
  if (!outArr) return { ok: false, error: 'Price not available for this route' };

  var out = legFor_(outArr, pallets);
  var result = {
    ok: true,
    currency: currency,
    from: oid, to: did, pallets: pallets,
    oneWay: { price: round2_(out.price), vehicles: out.vehicles },
    vehiclesText: vehiclesText_(out.vehicles)
  };

  var totalEur = out.price;
  if (opts.twoWays) {
    var retArr = data.rates[did + '-' + oid];
    if (!retArr) return { ok: false, error: 'Return price not available for this route' };
    var ret = legFor_(retArr, pallets);
    totalEur += ret.price;
    var allVeh = {};
    [out.vehicles, ret.vehicles].forEach(function (v) {
      for (var k in v) allVeh[k] = (allVeh[k] || 0) + v[k];
    });
    result.return = { price: round2_(ret.price), vehicles: ret.vehicles };
    result.vehiclesText = vehiclesText_(allVeh);
    result.twoWays = true;
  }

  result.totalEur = round2_(totalEur);
  result.total = Math.round(totalEur * fx);          // whole units in chosen currency
  result.totalExact = round2_(totalEur * fx);
  return result;
}

function round2_(x) { return Math.round(x * 100) / 100; }

/**
 * Optional: deploy THIS script as a web app to expose a JSON endpoint, e.g.
 *   .../exec?from=HAM&to=CPH&pallets=8&currency=DKK&twoWays=1
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var r = calculateTransport(p.from, p.to, p.pallets, {
    currency: p.currency,
    twoWays: p.twoWays === '1' || p.twoWays === 'true',
    m3: p.m3
  });
  return ContentService.createTextOutput(JSON.stringify(r))
    .setMimeType(ContentService.MimeType.JSON);
}
