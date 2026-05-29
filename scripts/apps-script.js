/**
 * Google Apps Script for One-Way Sync (Sheets → Dashboard)
 *
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions → Apps Script.
 * 3. Replace all the code in Code.gs with this script.
 * 4. Replace `YOUR_DASHBOARD_URL` with your deployed dashboard URL.
 * 5. Replace `YOUR_SECRET` with the value of SHEET_WEBHOOK_SECRET in your .env.
 * 6. Save the script and add an installable onEdit trigger.
 */

const WEBHOOK_URL = "YOUR_DASHBOARD_URL/api/sheet-webhook";
const WEBHOOK_SECRET = "YOUR_SECRET"; // Must match process.env.SHEET_WEBHOOK_SECRET

function onEdit(e) {
  if (!e) return;

  const range = e.range;
  const sheet = range.getSheet();
  const row = range.getRow();

  // Ignore header row
  if (row <= 1) return;

  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

  const payload = {
    sheetName: sheet.getName(),
    spreadsheetId: spreadsheetId,
    row: row,
    col: range.getColumn(),
    oldValue: e.oldValue,
    newValue: e.value,
    timestamp: new Date().toISOString()
  };

  sendWebhook(payload);
}

function sendWebhook(payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-webhook-secret": WEBHOOK_SECRET
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch (error) {
    console.error("Failed to send webhook:", error);
  }
}
