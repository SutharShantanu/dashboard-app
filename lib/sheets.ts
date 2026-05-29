/**
 * lib/sheets.ts — thin re-export layer
 *
 * All logic has been moved to lib/services/. This file keeps the public API
 * stable so existing call sites continue to work without a big-bang import churn.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

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
  perSheetPermissions?: Record<string, string[]>;
  isActive: "TRUE" | "FALSE";
  createdAt: string;
  createdBy: string;
  gender?: string;
  otpCode?: string;
  otpExpiry?: string;
}

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

export type AuditLog = AuditLogInterface;

export interface ConnectedSheet {
  spreadsheetId: string;
  title: string;
  sheetName: string;
  url: string;
  addedBy: string;
  createdAt: string;
}

// ─── Re-exports from services ─────────────────────────────────────────────────

export { appendAuditLog } from "./services/audit.service";

export {
  getSheetsClient,
  listDriveFiles,
  fetchRawGoogleSheetsData,
} from "./services/google-sheets.service";

export {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resolveUserAllowedColumns,
} from "./services/user.service";

export {
  syncSheetData,
  getStudents,
  createStudent,
  updateStudentCell,
} from "./services/student.service";

export {
  getConnectedSheets,
  addConnectedSheet,
  removeConnectedSheet,
} from "./services/connected-sheet.service";

// ─── Remaining helpers still implemented here ─────────────────────────────────

import connectToDatabase from "./mongodb";
import User from "../models/User";
import ConnectedSheet from "../models/ConnectedSheet";
import { appendAuditLog } from "./services/audit.service";

export async function initSheets(): Promise<void> {
  await connectToDatabase();

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
      createdBy: "system",
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
      createdBy: "system",
    });
  }
}

export function getDbMode() {
  return { isSimulated: false, isConfigured: true };
}

export async function getLogs(): Promise<AuditLog[]> {
  await connectToDatabase();
  const { default: AuditLogModel } = await import("../models/AuditLog");
  const logs = await AuditLogModel.find({}).sort({ timestamp: -1 }).limit(500);
  return logs.map((l) => ({
    timestamp: l.timestamp.toISOString(),
    actor: l.actor,
    actorDisplayName: l.actorDisplayName,
    actorRole: l.actorRole,
    action: l.action as AuditLogInterface["action"],
    targetRow: l.targetRow,
    columnChanged: l.columnChanged,
    oldValue: l.oldValue,
    newValue: l.newValue,
    ip: l.ip,
    userAgent: l.userAgent,
    details: l.details,
  }));
}

export async function getSheetNames(): Promise<string[]> {
  await connectToDatabase();
  const sheets = await ConnectedSheet.find({});
  const names = sheets.map((s) => s.sheetName);
  if (!names.includes("Students")) names.unshift("Students");
  return names;
}

export async function addSheetTab(title: string): Promise<void> {
  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor: "admin",
    actorDisplayName: "Admin",
    actorRole: "admin",
    action: "SHEET_CONNECT",
    targetRow: title,
    details: `Added new sheet tab: ${title}`,
  });
}
