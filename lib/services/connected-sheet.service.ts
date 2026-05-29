import connectToDatabase from "../mongodb";
import User from "../../models/User";
import ConnectedSheet from "../../models/ConnectedSheet";
import { appendAuditLog } from "./audit.service";
import { getSheetsClient } from "./google-sheets.service";
import { escapeRegex } from "../utils-internal";
import type { ConnectedSheet as ConnectedSheetType } from "../sheets";

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function getConnectedSheets(): Promise<ConnectedSheetType[]> {
  await connectToDatabase();
  const sheets = await ConnectedSheet.find({});
  return sheets.map((s) => ({
    spreadsheetId: s.spreadsheetId,
    title: s.title,
    sheetName: s.sheetName,
    url: s.url,
    addedBy: s.addedBy,
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function addConnectedSheet(
  url: string,
  title: string,
  addedBy: string,
  ip: string = "unknown"
): Promise<ConnectedSheetType> {
  await connectToDatabase();
  const spreadsheetId = extractSpreadsheetId(url);
  if (!spreadsheetId) throw new Error("Invalid Google Sheets URL");

  let sheetName = "Sheet1";
  let spreadsheetTitle = "Connected Sheet";
  const client = getSheetsClient();
  if (client) {
    const response = await client.spreadsheets.get({ spreadsheetId });
    if (response.data.sheets && response.data.sheets.length > 0) {
      sheetName = response.data.sheets[0].properties?.title || "Sheet1";
    }
    spreadsheetTitle = response.data.properties?.title || "Connected Sheet";
  }

  const existing = await ConnectedSheet.findOne({ spreadsheetId });
  if (existing) throw new Error("Sheet already connected");

  const newSheet = await ConnectedSheet.create({
    spreadsheetId,
    title: title || spreadsheetTitle,
    sheetName,
    url,
    addedBy,
    createdAt: new Date(),
  });

  // Auto-grant the user who added this sheet full access to all its columns.
  try {
    const escaped = escapeRegex(addedBy);
    const adderUser = await User.findOne({
      username: { $regex: new RegExp(`^${escaped}$`, "i") },
    });
    if (adderUser) {
      const currentPerms: Record<string, string[]> = adderUser.perSheetPermissions
        ? Object.fromEntries(
            (adderUser.perSheetPermissions as Map<string, string[]>).entries()
          )
        : {};
      currentPerms[sheetName] = ["*"];
      adderUser.perSheetPermissions = new Map(Object.entries(currentPerms));
      await adderUser.save();
    }
  } catch (permErr) {
    console.error(
      "[addConnectedSheet] Failed to auto-grant perSheetPermissions:",
      permErr
    );
  }

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor: addedBy,
    actorDisplayName: addedBy,
    actorRole: "admin",
    action: "SHEET_CONNECT",
    targetRow: spreadsheetId,
    columnChanged: "URL",
    oldValue: "",
    newValue: url,
    ip,
    details: `Connected new Google Sheet: ${title}`,
  });

  return {
    spreadsheetId: newSheet.spreadsheetId,
    title: newSheet.title,
    sheetName: newSheet.sheetName,
    url: newSheet.url,
    addedBy: newSheet.addedBy,
    createdAt: newSheet.createdAt.toISOString(),
  };
}

export async function removeConnectedSheet(
  targetSpreadsheetId: string,
  actor: string = "admin",
  ip: string = "unknown"
): Promise<void> {
  await connectToDatabase();
  await ConnectedSheet.deleteOne({ spreadsheetId: targetSpreadsheetId });

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    actorDisplayName: actor,
    actorRole: "admin",
    action: "SHEET_DISCONNECT",
    targetRow: targetSpreadsheetId,
    columnChanged: "SPREADSHEET_ID",
    oldValue: targetSpreadsheetId,
    newValue: "",
    ip,
    details: `Disconnected Google Sheet: ${targetSpreadsheetId}`,
  });
}
