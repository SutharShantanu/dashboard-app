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
  __rowIndex?: number;
  [key: string]: string | number | undefined;
}

export interface UserInterface {
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: "admin" | "sub-admin";
  allowedColumns: string;
  permissionPreset?: string;
  perSheetPermissions?: any;
  isActive: "TRUE" | "FALSE";
  createdAt: string;
  createdBy: string;
  gender?: string;
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
    | "USER_DELETE" 
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
  userAgent?: string;
  details?: string;
}

export async function fetchRawGoogleSheetsData(spreadsheetId: string, range: string = "Students!A:Z"): Promise<{ data: Student[] }> {
  const client = getSheetsClient();
  if (!client) throw new Error("Google Sheets client not initialized. Check your credentials.");

  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return { data: [] };

  const headers = rows[0];
  const data = rows.slice(1).map((row: any, index: number) => {
    const obj: any = {};
    headers.forEach((header: string, colIndex: number) => {
      obj[header] = row[colIndex] || "";
    });
    obj["__rowIndex"] = index + 2; // Row 2 is the first data row
    return obj as Student;
  });

  return { data };
}

export async function syncSheetData(spreadsheetId: string): Promise<void> {
  await connectToDatabase();
  const connectedSheet = await ConnectedSheet.findOne({ spreadsheetId });
  if (!connectedSheet) throw new Error("Connected sheet not found");

  const { data } = await fetchRawGoogleSheetsData(spreadsheetId, `${connectedSheet.sheetName}!A:AZ`);
  
  for (const item of data) {
    const id = String(item.ID || item.id || item.Id || (item.__rowIndex ? `row_${item.__rowIndex}` : Object.values(item)[0]));
    if (!id) continue;

    const existing = await SheetRow.findOne({ rowId: id, sheetId: spreadsheetId });
    if (!existing) {
       await SheetRow.create({
          sheetId: spreadsheetId,
          rowId: id,
          data: item,
          lastModifiedBy: "system",
          lastModifiedAt: new Date()
       });
    } else if (existing.lastModifiedBy === "system") {
       existing.data = item;
       existing.lastModifiedAt = new Date();
       existing.markModified("data");
       await existing.save();
    }
  }
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
  
  // Seed initial admin user if none exist
  const count = await User.countDocuments();
  if (count === 0) {
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash("admin123", 12);
    await User.create({
      username: "admin",
      displayName: "System Administrator",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
      allowedColumns: "",
      isActive: true,
      createdBy: "system"
    });

    const subAdminHash = await bcrypt.default.hash("subadmin123", 12);
    await User.create({
      username: "subadmin",
      displayName: "Sub Administrator",
      email: "subadmin@example.com",
      passwordHash: subAdminHash,
      role: "sub-admin",
      allowedColumns: "",
      isActive: true,
      createdBy: "system"
    });
  }
}

export function getDbMode() {
  return { isSimulated: false, isConfigured: true };
}

export async function getUsers(): Promise<User[]> {
  await connectToDatabase();
  const users = await User.find({});
  return users.map(u => ({
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    passwordHash: u.passwordHash,
    role: u.role,
    allowedColumns: u.allowedColumns,
    permissionPreset: u.permissionPreset,
    perSheetPermissions: u.perSheetPermissions,
    isActive: u.isActive ? "TRUE" : "FALSE",
    createdAt: u.createdAt.toISOString(),
    createdBy: u.createdBy,
    gender: u.gender || "",
    otpCode: u.otpCode,
    otpExpiry: u.otpExpiry ? u.otpExpiry.toISOString() : undefined
  }));
}

export async function createUser(user: User, actor: string = "system", actorRole: string = "system", ip: string = "127.0.0.1"): Promise<void> {
  await connectToDatabase();
  await User.create({
    ...user,
    isActive: user.isActive === "TRUE",
    createdAt: new Date(user.createdAt)
  });

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    actorDisplayName: actor,
    actorRole,
    action: "USER_CREATE",
    targetRow: user.username,
    ip,
    details: `Created user account: ${user.username} (${user.role})`
  });
}

export async function updateUser(username: string, updates: Partial<User>, actor: string = "system", actorRole: string = "system", ip: string = "127.0.0.1"): Promise<void> {
  await connectToDatabase();
  const mongoUpdates: any = { ...updates };
  if (updates.isActive !== undefined) {
    mongoUpdates.isActive = updates.isActive === "TRUE";
  }
  
  const escapedUsername = username.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  await User.updateOne(
    { username: { $regex: new RegExp(`^${escapedUsername}$`, "i") } },
    { $set: mongoUpdates }
  );

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    actorDisplayName: actor,
    actorRole,
    action: "USER_UPDATE",
    targetRow: username,
    ip,
    details: `Updated user account: ${username}. Changes: ${Object.keys(updates).join(", ")}`
  });
}

export async function deleteUser(username: string, actor: string = "system", actorRole: string = "system", ip: string = "127.0.0.1"): Promise<void> {
  await connectToDatabase();
  const escapedUsername = username.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  await User.deleteOne({
    username: { $regex: new RegExp(`^${escapedUsername}$`, "i") }
  });

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    actorDisplayName: actor,
    actorRole,
    action: "USER_DELETE",
    targetRow: username,
    ip,
    details: `Deleted user account: ${username}`
  });
}

const DEFAULT_COLUMNS = ["ID", "Name", "Email", "Phone", "Course", "Batch", "Status", "Score", "Grade", "Comments", "Notes", "LastModifiedBy", "LastModifiedAt", "Remarks"];

export async function getStudents(sheetName: string = "Students", spreadsheetId?: string): Promise<{ data: Student[], columns: string[] }> {
  await connectToDatabase();
  const targetSheetId = spreadsheetId || "default";
  
  let rows;
  if (targetSheetId === "all") {
    rows = await SheetRow.find({});
  } else {
    rows = await SheetRow.find({ sheetId: targetSheetId });
    if (rows.length === 0 && spreadsheetId && spreadsheetId !== "default") {
      try {
        await syncSheetData(spreadsheetId);
        rows = await SheetRow.find({ sheetId: targetSheetId });
      } catch (e) {
        console.error("Failed to sync on load:", e);
      }
    }
  }
  
  const data = rows.map(r => ({
    ...r.data,
    ID: r.rowId,
    LastModifiedBy: r.lastModifiedBy,
    LastModifiedAt: r.lastModifiedAt.toISOString()
  })) as Student[];

  // Dynamically determine columns from data by checking all rows
  const columnsSet = new Set<string>();
  rows.forEach(r => {
    if (r.data) {
      Object.keys(r.data).forEach(k => columnsSet.add(k));
    }
  });
  const columns = columnsSet.size > 0 ? Array.from(columnsSet) : DEFAULT_COLUMNS;
  const finalColumns = [...columns];
  if (!finalColumns.includes("ID")) finalColumns.unshift("ID");
  if (!finalColumns.includes("LastModifiedBy")) finalColumns.push("LastModifiedBy");
  if (!finalColumns.includes("LastModifiedAt")) finalColumns.push("LastModifiedAt");

  return { data, columns: finalColumns };
}

export async function createStudent(student: Student, actor: string = "system", actorRole: string = "system", ip: string = "127.0.0.1", sheetName: string = "Students", spreadsheetId?: string): Promise<void> {
  await connectToDatabase();
  const targetSheetId = spreadsheetId || "default";
  
  await SheetRow.create({
    rowId: student.ID,
    sheetId: targetSheetId,
    data: student,
    lastModifiedBy: actor,
    lastModifiedAt: new Date()
  });

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    actorDisplayName: actor,
    actorRole,
    action: "STUDENT_CREATE",
    targetRow: student.ID,
    ip,
    details: `Created student record: ${student.Name} (${student.ID})`
  });

  sseManager.broadcast({
    type: "cell_update",
    payload: { id: student.ID, data: student }
  });
}

export async function updateStudentCell(id: string, column: string, newValue: string, actor: string = "system", actorRole: string = "system", ip: string = "127.0.0.1", sheetName: string = "Students", spreadsheetId?: string): Promise<void> {
  await connectToDatabase();
  const targetSheetId = spreadsheetId || "default";
  
  const row = await SheetRow.findOne({ rowId: id, sheetId: targetSheetId });
  if (!row) throw new Error("Student record not found");

  const oldValue = row.data[column] || "";
  row.data[column] = newValue;
  row.lastModifiedBy = actor;
  row.lastModifiedAt = new Date();
  
  row.markModified("data");
  await row.save();

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    actorDisplayName: actor,
    actorRole,
    action: "STUDENT_UPDATE",
    targetRow: id,
    columnChanged: column,
    oldValue: String(oldValue),
    newValue: String(newValue),
    ip,
    details: `Updated ${column} for student ${id}`
  });

  sseManager.broadcast({
    type: "cell_update",
    payload: { id, column, value: newValue, lastModifiedBy: actor, lastModifiedAt: row.lastModifiedAt.toISOString() }
  });
}

export async function getLogs(): Promise<AuditLog[]> {
  await connectToDatabase();
  const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(500);
  return logs.map(l => ({
    timestamp: l.timestamp.toISOString(),
    actor: l.actor,
    actorDisplayName: l.actorDisplayName,
    actorRole: l.actorRole,
    action: l.action as any,
    targetRow: l.targetRow,
    columnChanged: l.columnChanged,
    oldValue: l.oldValue,
    newValue: l.newValue,
    ip: l.ip,
    userAgent: l.userAgent,
    details: l.details
  }));

}

export async function getSheetNames(): Promise<string[]> {
  await connectToDatabase();
  const sheets = await ConnectedSheet.find({});
  const names = sheets.map(s => s.sheetName);
  if (!names.includes("Students")) names.unshift("Students");
  return names;
}

export async function addSheetTab(title: string): Promise<void> {
  // In MongoDB mode, we don't necessarily need to "create" a tab,
  // but we can ensure it's tracked if needed.
  // For now, we'll just log it.
  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor: "admin",
    actorDisplayName: "Admin",
    actorRole: "admin",
    action: "SHEET_CONNECT", // Or a new action like SHEET_CREATE
    targetRow: title,
    details: `Added new sheet tab: ${title}`
  });
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
    userAgent: log.userAgent || "",
    details: log.details || `Action: ${log.action} on ${log.targetRow}`,
  });
}

export async function addConnectedSheet(url: string, title: string, addedBy: string, ip: string = "unknown"): Promise<ConnectedSheet> {
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
    createdAt: new Date()
  });

  // Auto-grant the user who added this sheet full access to all its columns.
  // This ensures SabaAdmin (and any admin who connects a sheet) always has
  // perSheetPermissions["<sheetName>"] = ["*"] set by default.
  try {
    const escapedAdder = addedBy.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const adderUser = await User.findOne({
      username: { $regex: new RegExp(`^${escapedAdder}$`, "i") }
    });
    if (adderUser) {
      // Merge with existing perSheetPermissions (preserve other sheets' permissions)
      const currentPerms: Record<string, string[]> = adderUser.perSheetPermissions
        ? Object.fromEntries((adderUser.perSheetPermissions as Map<string, string[]>).entries())
        : {};
      currentPerms[sheetName] = ["*"];
      adderUser.perSheetPermissions = new Map(Object.entries(currentPerms));
      await adderUser.save();
    }
  } catch (permErr) {
    console.error("[addConnectedSheet] Failed to auto-grant perSheetPermissions:", permErr);
    // Non-fatal: sheet was still connected successfully
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

export function resolveUserAllowedColumns(
  user: {
    role: "admin" | "sub-admin";
    allowedColumns: string;
    perSheetPermissions?: Record<string, string[]>;
  },
  activeSheet: string,
  allColumns: string[]
): string[] {
  // 1. Check if perSheetPermissions is configured (i.e. has at least one sheet key)
  const hasPerSheetConfig = user.perSheetPermissions && Object.keys(user.perSheetPermissions).length > 0;
  
  if (hasPerSheetConfig) {
    let sheetPerms: string[] | undefined = undefined;
    const keys = Object.keys(user.perSheetPermissions!);
    const matchKey = keys.find(k => k.toLowerCase() === activeSheet.toLowerCase());
    if (matchKey) {
      sheetPerms = user.perSheetPermissions![matchKey];
    }
    
    if (sheetPerms && Array.isArray(sheetPerms)) {
      if (sheetPerms.includes("*")) {
        return [...allColumns];
      }
      return allColumns.filter(col => sheetPerms.includes(col));
    }
    // If perSheetPermissions is configured generally, but this activeSheet has no entry,
    // they are strictly constrained and cannot edit/view any columns for this sheet.
    // However, if they are an admin, they should still have access to all columns
    if (user.role === "admin") {
      return [...allColumns];
    }
    return [];
  }

  // 2. Check if custom allowedColumns limits are configured
  if (user.allowedColumns) {
    if (user.allowedColumns === "*" || user.allowedColumns.toLowerCase() === "all") {
      return [...allColumns];
    }
    const list = user.allowedColumns.split(",").map(c => c.trim());
    return allColumns.filter(col => list.includes(col));
  }

  // 3. Fallback: Admins get all columns, others get empty
  if (user.role === "admin") {
    return [...allColumns];
  }
  
  return [];
}

