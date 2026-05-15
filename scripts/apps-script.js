/**
 * Google Apps Script for Two-Way Sync
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions -> Apps Script.
 * 3. Replace all the code in Code.gs with this script.
 * 4. Replace `YOUR_DASHBOARD_URL` with your actual deployed dashboard URL (e.g., https://your-app.vercel.app).
 * 5. Replace `YOUR_SECRET` with the same secret used in your environment variable SHEET_WEBHOOK_SECRET.
 * 6. Save the script.
 * 7. In the Apps Script editor, go to Triggers (the clock icon on the left).
 * 8. Add a new trigger:
 *    - Choose which function to run: onEdit
 *    - Select event source: From spreadsheet
 *    - Select event type: On edit
 * 9. Authorize the script when prompted.
 */

const WEBHOOK_URL = "YOUR_DASHBOARD_URL/api/sheet-webhook";
const WEBHOOK_SECRET = "YOUR_SECRET"; // Should match process.env.SHEET_WEBHOOK_SECRET

function onEdit(e) {
  if (!e) return;
  
  const range = e.range;
  const sheet = range.getSheet();
  
  const payload = {
    sheetName: sheet.getName(),
    row: range.getRow(),
    col: range.getColumn(),
    oldValue: e.oldValue,
    newValue: e.value,
    timestamp: new Date().toISOString()
  };
  
  // Only send webhook if it's a data row (ignoring header row 1)
  if (payload.row > 1) {
    sendWebhook(payload);
  }
}

function sendWebhook(payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + WEBHOOK_SECRET
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
