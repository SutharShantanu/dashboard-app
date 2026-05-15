import { google } from "googleapis";
import connectToDatabase from "./mongodb";
import User, { IUser } from "../models/User";
import AuditLog from "../models/AuditLog";
import SheetRow from "../models/SheetRow";
import ConnectedSheet from "../models/ConnectedSheet";
import { sseManager } from "./sse";

export interface Student {
  ID: string;
  Name: string;
  Email: string;
  Phone: string;
  Course: string;
  Batch: string;
  Status: string;
  Score: string;
  Remarks: string;
  LastModifiedBy: string;
  LastModifiedAt: string;
  [key: string]: string;
}

export interface UserInterface {
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: "admin" | "sub-admin";
  allowedColumns: string;
  isActive: "TRUE" | "FALSE";
  createdAt: string;
  createdBy: string;
  otpCode?: string;
  otpExpiry?: string;
}

// Ensure alias so we don't conflict with existing code
export type User = UserInterface;

export interface AuditLogInterface {
  timestamp: string;
  actor: string;
  actorDisplayName: string;
  actorRole: string;
  action: 
    | "READ" 
    | "WRITE" 
    | "USER_CREATE" 
    | "USER_UPDATE" 
    | "USER_DEACTIVATE" 
    | "USER_ACTIVATE" 
    | "STUDENT_CREATE"
    | "STUDENT_UPDATE"
    | "STUDENT_DELETE"
    | "LOGIN"
    | "LOGOUT"
    | "SHEET_SYNC"
    | "SHEET_CONNECT"
    | "SHEET_DISCONNECT";
  targetRow: string;
  columnChanged?: string;
  oldValue?: string;
  newValue?: string;
  ip?: string;
  details?: string;
}

export type AuditLog = AuditLogInterface;

export interface ConnectedSheet {
  spreadsheetId: string;
  title: string;
  sheetName: string;
  url: string;
  addedBy: string;
  createdAt: string;
}

let sheetsClient: any = null;

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  
  const hasGoogleCreds = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!process.env.GOOGLE_SHEET_ID;
  if (!hasGoogleCreds) return null;

  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly"
      ],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
  } catch (err) {
    console.error("[Sheets DB] Failed to load Google credentials:", err);
    return null;
  }
}

export async function listDriveFiles(folderId?: string) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const drive = google.drive({ version: "v3", auth });

  const query = folderId 
    ? `'${folderId}' in parents and (mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`
    : `(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`;

  const response = await drive.files.list({
    q: query,
    fields: "files(id, name, mimeType, webViewLink, iconLink)",
    orderBy: "folder,name",
  });

  return response.data.files || [];
}

const sheetId = process.env.GOOGLE_SHEET_ID || "";
let studentSheetName = "Students"; 

export async function initSheets(): Promise<void> {
  await connectToDatabase();
}

export function getDbMode() {
  return { isSimulated: false, isConfigured: true };
}

export async function getConnectedSheets(): Promise<ConnectedSheet[]> {
  await connectToDatabase();
  const sheets = await ConnectedSheet.find({});
  return sheets.map(s => ({
    spreadsheetId: s.spreadsheetId,
    title: s.title,
    sheetName: s.sheetName,
    url: s.url,
    addedBy: s.addedBy,
    createdAt: s.createdAt.toISOString()
  }));
}

export async function appendAuditLog(log: AuditLog): Promise<void> {
  await connectToDatabase();
  await AuditLog.create({
    timestamp: new Date(log.timestamp),
    actor: log.actor,
    actorDisplayName: log.actorDisplayName,
    actorRole: log.actorRole,
    action: log.action,
    targetRow: log.targetRow,
    columnChanged: log.columnChanged || "",
    oldValue: log.oldValue || "",
    newValue: log.newValue || "",
    ip: log.ip || "127.0.0.1",
    details: log.details || `Action: ${log.action} on ${log.targetRow}`,
  });
}

export async function addConnectedSheet(url: string, title: string, addedBy: string, ip: string = "unknown"): Promise<ConnectedSheet> {
  await connectToDatabase();
  const spreadsheetId = extractSpreadsheetId(url);
  if (!spreadsheetId) throw new Error("Invalid Google Sheets URL");

  let sheetName = "Sheet1";
  if (sheetsClient) {
     const response = await sheetsClient.spreadsheets.get({ spreadsheetId });
     if (response.data.sheets && response.data.sheets.length > 0) {
       sheetName = response.data.sheets[0].properties?.title || "Sheet1";
     }
  }

  const existing = await ConnectedSheet.findOne({ spreadsheetId });
  if (existing) throw new Error("Sheet already connected");

  const newSheet = await ConnectedSheet.create({
    spreadsheetId,
    title,
    sheetName,
    url,
    addedBy,
    createdAt: new Date()
  });

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
    details: `Connected new Google Sheet: ${title}`
  });

  return {
    spreadsheetId: newSheet.spreadsheetId,
    title: newSheet.title,
    sheetName: newSheet.sheetName,
    url: newSheet.url,
    addedBy: newSheet.addedBy,
    createdAt: newSheet.createdAt.toISOString()
  };
}

export async function removeConnectedSheet(targetSpreadsheetId: string, actor: string = "admin", ip: string = "unknown"): Promise<void> {
  await connectToDatabase();
  await ConnectedSheet.deleteOne({ spreadsheetId: targetSpreadsheetId });
  
  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor: actor,
    actorDisplayName: actor,
    actorRole: "admin",
    action: "SHEET_DISCONNECT",
    targetRow: targetSpreadsheetId,
    columnChanged: "SPREADSHEET_ID",
    oldValue: targetSpreadsheetId,
    newValue: "",
    ip,
    details: `Disconnected Google Sheet: ${targetSpreadsheetId}`
  });
}


function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}
