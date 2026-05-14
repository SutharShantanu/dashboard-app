# Google Sheets Two-Way Real-Time Sync Strategy

This document outlines the ready-to-paste Apps Script module required to turn any connected Google Spreadsheet into a real-time event producer for our dashboard.

## Installation Instructions

1. Open your Google Spreadsheet.
2. Click **Extensions → Apps Script**.
3. Replace any existing code in `Code.gs` with the complete script below.
4. Replace `YOUR_APP_URL` with your actual Vercel/production deployment URL.
5. Click **Save**.

---

## Ready-to-Paste Apps Script Code

```javascript
/**
 * Configuration
 */
const WEBHOOK_URL = "https://your-app.vercel.app/api/sheet-webhook";
const WEBHOOK_SECRET = "YOUR_SUPER_SECRET_KEY";

/**
 * Layer 1: Instant Webhook Trigger on Manual Edits
 */
function onEdit(e) {
  if (!e || !e.range) return;

  try {
    const range = e.range;
    const sheet = range.getSheet();
    const sheetName = sheet.getName();
    
    // Ignore internal metadata sheets if necessary
    if (sheetName === "ConnectedSpreadsheets") return;

    const row = range.getRow();
    const col = range.getColumn();
    const headerRange = sheet.getRange(1, col);
    const colName = headerRange.getValue();
    
    // Assume Col A is Student ID
    const idRange = sheet.getRange(row, 1);
    const studentId = idRange.getValue();

    const payload = {
      range: range.getA1Notation(),
      sheetName: sheetName,
      oldValue: e.oldValue,
      newValue: e.value,
      row: row,
      col: col,
      colName: colName,
      studentId: studentId,
      timestamp: new Date().toISOString()
    };

    UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("Webhook propagation error: " + err.toString());
  }
}

/**
 * Fallback Scheduled Diff Checker (Runs every 5 minutes)
 * Captures formula recalculations and third-party API mutations.
 */
function scheduledDiffCheck() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getName() === "ConnectedSpreadsheets") return;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return; // Only headers

    const headers = data[0];
    const scriptProperties = PropertiesService.getScriptProperties();
    const lastHashKey = "SHEET_HASH_" + sheet.getName();
    const prevHash = scriptProperties.getProperty(lastHashKey);

    // Compute a lightweight hash of current sheet contents
    let currentHash = 0;
    for (let r = 1; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const val = String(data[r][c]);
        for (let i = 0; i < val.length; i++) {
          currentHash = ((currentHash << 5) - currentHash) + val.charCodeAt(i);
          currentHash |= 0;
        }
      }
    }

    const currentHashStr = String(currentHash);
    if (prevHash !== currentHashStr) {
      // Content changed via formulas or external APIs -> Broadcast full sync event
      UrlFetchApp.fetch(WEBHOOK_URL, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          type: "full_sync_required",
          sheetName: sheet.getName(),
          timestamp: new Date().toISOString()
        }),
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
        muteHttpExceptions: true
      });
      scriptProperties.setProperty(lastHashKey, currentHashStr);
    }
  } catch (err) {
    Logger.log("Scheduled diff check error: " + err.toString());
  }
}
```
