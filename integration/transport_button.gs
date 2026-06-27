/**
 * Rent.Group Transport tool — "open the calculator" button for RFQ Analyser.
 *
 * Adds a custom menu + a button (modal dialog) to the RFQ spreadsheet that opens
 * the public transport calculator:
 *
 *   https://matiasbjerre-hub.github.io/Transport/
 *
 * This is the UI counterpart to transport_calc.gs: that module computes a price
 * in code; this one just lets a user open the full web tool from inside RFQ.
 *
 * --- Install -------------------------------------------------------------
 * 1. Paste this file into the RFQ Apps Script project (then `clasp push`).
 * 2. Reload the spreadsheet. A "Transport" menu appears with
 *    "Open transport calculator".
 *
 * NOTE: a project can have only ONE onOpen(). If RFQ already defines onOpen,
 * do NOT add this one — instead call addTransportMenu_() from the existing
 * onOpen, e.g.:
 *
 *   function onOpen() {
 *     // ...your existing menu setup...
 *     addTransportMenu_();
 *   }
 * -------------------------------------------------------------------------
 */

// Public, login-free URL of the transport calculator (GitHub Pages).
var TRANSPORT_APP_URL = 'https://matiasbjerre-hub.github.io/Transport/';

/**
 * Runs automatically when the spreadsheet is opened. Adds the Transport menu.
 * (Remove this function and call addTransportMenu_() from your own onOpen if
 * the project already has one.)
 */
function onOpen() {
  addTransportMenu_();
}

/** Adds the "Transport" menu to the spreadsheet UI. */
function addTransportMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('Transport')
    .addItem('Open transport calculator', 'openTransportTool')
    .addToUi();
}

/**
 * Opens the transport calculator in a modal dialog (embedded), with a button to
 * open it in a separate browser tab as a fallback.
 */
function openTransportTool() {
  var url = TRANSPORT_APP_URL;
  var html =
    '<!DOCTYPE html><html><head><base target="_blank">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>' +
    'html,body{margin:0;height:100%;font-family:Arial,Helvetica,sans-serif;}' +
    '.bar{display:flex;align-items:center;justify-content:space-between;' +
    'gap:8px;padding:8px 12px;background:#1a1a1a;color:#fff;}' +
    '.bar a{display:inline-block;padding:6px 12px;background:#c8102e;color:#fff;' +
    'text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;}' +
    'iframe{border:0;width:100%;height:calc(100% - 46px);display:block;}' +
    '</style></head><body>' +
    '<div class="bar"><span>Rent.Group Transport calculator</span>' +
    '<a href="' + url + '" target="_blank" rel="noopener">Open in new tab ↗</a></div>' +
    '<iframe src="' + url + '"></iframe>' +
    '</body></html>';

  var ui = HtmlService.createHtmlOutput(html)
    .setWidth(720)
    .setHeight(680);
  SpreadsheetApp.getUi().showModalDialog(ui, 'Transport calculator');
}
