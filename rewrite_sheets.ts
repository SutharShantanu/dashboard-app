import fs from 'fs';

const content = `import { google } from "googleapis";
import connectToDatabase from "./mongodb";
import User, { IUser } from "../models/User";
import AuditLog from "../models/AuditLog";
import SheetRow from "../models/SheetRow";
import ConnectedSheet from "../models/ConnectedSheet";

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
  action: "READ" | "WRITE" | "USER_CREATE" | "USER_UPDATE" | "USER_DEACTIVATE" | "USER_ACTIVATE" | "STUDENT_CREATE";
  targetRow: string;
  columnChanged: string;
  oldValue: string;
  newValue: string;
  ip: string;
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

const hasGoogleCreds = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!process.env.GOOGLE_SHEET_ID;
let sheetsClient: any = null;
if (hasGoogleCreds) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  } catch (err) {
    console.error("[Sheets DB] Failed to load Google credentials:", err);
  }
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

export async function addConnectedSheet(url: string, title: string, addedBy: string): Promise<ConnectedSheet> {
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

  return {
    spreadsheetId: newSheet.spreadsheetId,
    title: newSheet.title,
    sheetName: newSheet.sheetName,
    url: newSheet.url,
    addedBy: newSheet.addedBy,
    createdAt: newSheet.createdAt.toISOString()
  };
}

export async function removeConnectedSheet(targetSpreadsheetId: string): Promise<void> {
  await connectToDatabase();
  await ConnectedSheet.deleteOne({ spreadsheetId: targetSpreadsheetId });
}

export async function getSheetNames(): Promise<string[]> {
  await connectToDatabase();
  const sheets = await ConnectedSheet.find({});
  return sheets.map(s => s.sheetName);
}

export async function addSheetTab(title: string): Promise<void> {
  // Deprecated in mongo mode
}

export async function getStudents(targetSheet?: string, targetSpreadsheetId?: string): Promise<{ data: Student[]; columns: string[] }> {
  await connectToDatabase();
  const actualSpreadsheetId = targetSpreadsheetId || sheetId;
  const rows = await SheetRow.find({ sheetId: actualSpreadsheetId });
  
  const data = rows.map(r => r.data as Student);
  const allKeys = new Set<string>();
  data.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
  const columns = Array.from(allKeys);
  return { data, columns };
}

export async function updateStudentCell(
  studentId: string,
  column: string,
  value: string,
  actor: string,
  ip: string,
  targetSheet?: string,
  targetSpreadsheetId?: string
): Promise<{ success: boolean; error?: string }> {
  await connectToDatabase();
  const actualSpreadsheetId = targetSpreadsheetId || sheetId;
  
  const studentRow = await SheetRow.findOne({ sheetId: actualSpreadsheetId, rowId: studentId });
  if (!studentRow) return { success: false, error: "Student not found" };

  const oldValue = studentRow.data[column] || "";
  studentRow.data[column] = value;
  studentRow.data["LastModifiedBy"] = actor;
  studentRow.data["LastModifiedAt"] = new Date().toISOString();
  studentRow.markModified("data");
  await studentRow.save();

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor: actor,
    actorDisplayName: actor,
    actorRole: "unknown",
    action: "WRITE",
    targetRow: studentId,
    columnChanged: column,
    oldValue,
    newValue: value,
    ip
  });

  return { success: true };
}

export async function createStudent(
  studentData: Partial<Student>,
  actor: string,
  ip: string,
  targetSheet?: string,
  targetSpreadsheetId?: string
): Promise<{ success: boolean; error?: string }> {
  await connectToDatabase();
  const actualSpreadsheetId = targetSpreadsheetId || sheetId;
  
  const newRow = await SheetRow.create({
    sheetId: actualSpreadsheetId,
    rowId: studentData.ID || \`USR-\${Date.now()}\`,
    data: {
      ...studentData,
      LastModifiedBy: actor,
      LastModifiedAt: new Date().toISOString()
    }
  });

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor: actor,
    actorDisplayName: actor,
    actorRole: "unknown",
    action: "STUDENT_CREATE",
    targetRow: newRow.rowId,
    columnChanged: "ALL",
    oldValue: "",
    newValue: JSON.stringify(studentData),
    ip
  });

  return { success: true };
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
    isActive: u.isActive ? "TRUE" : "FALSE",
    createdAt: u.createdAt.toISOString(),
    createdBy: u.createdBy,
    gender: u.gender || "",
    otpCode: u.otpCode,
    otpExpiry: u.otpExpiry ? u.otpExpiry.toISOString() : undefined,
  }));
}

export async function createUser(
  userData: Partial<User>,
  actor: string,
  ip: string
): Promise<{ success: boolean; error?: string }> {
  await connectToDatabase();
  const existing = await User.findOne({ username: userData.username });
  if (existing) return { success: false, error: "Username already exists" };

  await User.create({
    username: userData.username,
    displayName: userData.displayName,
    email: userData.email,
    passwordHash: userData.passwordHash,
    role: userData.role,
    allowedColumns: userData.allowedColumns || "",
    isActive: userData.isActive === "TRUE",
    createdAt: new Date(),
    createdBy: actor,
  });

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor: actor,
    actorDisplayName: actor,
    actorRole: "admin",
    action: "USER_CREATE",
    targetRow: userData.username || "",
    columnChanged: "ALL",
    oldValue: "",
    newValue: "New User",
    ip
  });

  return { success: true };
}

export async function updateUser(
  username: string,
  updates: Partial<User>,
  actor: string,
  ip: string
): Promise<{ success: boolean; error?: string }> {
  await connectToDatabase();
  const user = await User.findOne({ username });
  if (!user) return { success: false, error: "User not found" };

  if (updates.displayName !== undefined) user.displayName = updates.displayName;
  if (updates.email !== undefined) user.email = updates.email;
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.allowedColumns !== undefined) user.allowedColumns = updates.allowedColumns;
  if (updates.isActive !== undefined) user.isActive = updates.isActive === "TRUE";
  if (updates.passwordHash !== undefined) user.passwordHash = updates.passwordHash;
  if (updates.otpCode !== undefined) user.otpCode = updates.otpCode;
  if (updates.otpExpiry !== undefined) user.otpExpiry = updates.otpExpiry ? new Date(updates.otpExpiry) : undefined;
  
  await user.save();

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor: actor,
    actorDisplayName: actor,
    actorRole: "unknown",
    action: "USER_UPDATE",
    targetRow: username,
    columnChanged: Object.keys(updates).join(","),
    oldValue: "...",
    newValue: "...",
    ip
  });

  return { success: true };
}

export async function getLogs(): Promise<AuditLog[]> {
  await connectToDatabase();
  const logs = await AuditLog.find({}).sort({ timestamp: -1 });
  return logs.map(l => ({
    timestamp: l.timestamp.toISOString(),
    actor: l.actor,
    actorDisplayName: l.actorDisplayName,
    actorRole: l.actorRole as any,
    action: l.action as any,
    targetRow: l.targetRow,
    columnChanged: l.details.split(",")[0]?.replace("Column: ", "") || "",
    oldValue: "",
    newValue: "",
    ip: l.details.includes("IP:") ? l.details.split("IP: ")[1] : ""
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
    details: \`Column: \${log.columnChanged}, Old: \${log.oldValue}, New: \${log.newValue}, IP: \${log.ip}\`,
  });
}

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\\/d\\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}
`

fs.writeFileSync('lib/sheets.ts', content);
