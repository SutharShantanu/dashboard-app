import fs from "fs";
import path from "path";
import { google } from "googleapis";

// Define TypeScript interfaces
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
  [key: string]: string; // Support dynamic columns
}

export interface User {
  username: string;
  displayName: string;
  passwordHash: string;
  role: "admin" | "sub-admin";
  allowedColumns: string; // Comma-separated list
  isActive: "TRUE" | "FALSE";
  createdAt: string;
  createdBy: string;
}

export interface AuditLog {
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

// Check if credentials are set
const hasGoogleCreds =
  !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!process.env.GOOGLE_SHEET_ID;

// Log initialization mode
console.log(
  hasGoogleCreds
    ? "[Sheets DB] Starting in GOOGLE SHEETS API mode."
    : "[Sheets DB] No Google Sheets credentials configured. Returning empty state."
);

// Helper to convert index to Column Letter (e.g., 0 -> A, 1 -> B, 25 -> Z, 26 -> AA)
function getColumnLetter(index: number): string {
  let temp = index;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Initialize google sheets client safely
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

let isInitializing = false;
let isInitialized = false;
let studentSheetName = "Students";

export async function initSheets(): Promise<void> {
  if (!hasGoogleCreds || !sheetsClient) return;
  if (isInitialized) return;

  if (isInitializing) {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return;
  }

  isInitializing = true;
  try {
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    const sheets = response.data.sheets || [];
    const sheetNames = sheets.map((s: any) => s.properties?.title || "");

    // Resolve student sheet name dynamically
    const studentsMatch = sheetNames.find(
      (name: string) => name.toLowerCase() === "students"
    );
    if (studentsMatch) {
      studentSheetName = studentsMatch;
    } else {
      const sheet1Match = sheetNames.find(
        (name: string) => name.toLowerCase() === "sheet1"
      );
      if (sheet1Match) {
        studentSheetName = sheet1Match;
      } else if (sheetNames.length > 0) {
        studentSheetName = sheetNames[0];
      } else {
        studentSheetName = "Students";
      }
    }

    // Check if Users and AuditLogs exist
    const hasUsers = sheetNames.includes("Users");
    const hasLogs = sheetNames.includes("AuditLogs");

    const requests: any[] = [];
    if (!hasUsers) {
      requests.push({
        addSheet: {
          properties: { title: "Users" },
        },
      });
    }
    if (!hasLogs) {
      requests.push({
        addSheet: {
          properties: { title: "AuditLogs" },
        },
      });
    }

    if (requests.length > 0) {
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests },
      });
      console.log(
        `[Sheets DB] Created missing sheets: ${requests
          .map((r) => r.addSheet.properties.title)
          .join(", ")}`
      );
    }

    // Seed default admin user in Users sheet if we had to create it
    if (!hasUsers) {
      const headers = [
        "username",
        "displayName",
        "passwordHash",
        "role",
        "allowedColumns",
        "isActive",
        "createdAt",
        "createdBy",
      ];
      const adminUser = [
        "admin",
        "Administrator",
        "$2b$12$CksCuudcs3zzOoqPxOtA6uoBpsytJ7IdQpfQuxiM1uvZnjqPDdW5S", // pre-hashed admin1234
        "admin",
        "ID,Name,Email,Phone,Course,Batch,Status,Score,Remarks,LastModifiedBy,LastModifiedAt",
        "TRUE",
        new Date().toISOString(),
        "system",
      ];
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Users!A1:H2",
        valueInputOption: "RAW",
        requestBody: {
          values: [headers, adminUser],
        },
      });
      console.log("[Sheets DB] Seeded default admin user in Users sheet.");
    }

    // Seed AuditLogs headers if we had to create it
    if (!hasLogs) {
      const headers = [
        "timestamp",
        "actor",
        "actorDisplayName",
        "actorRole",
        "action",
        "targetRow",
        "columnChanged",
        "oldValue",
        "newValue",
        "ip",
      ];
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "AuditLogs!A1:J1",
        valueInputOption: "RAW",
        requestBody: {
          values: [headers],
        },
      });
      console.log("[Sheets DB] Seeded AuditLogs headers.");
    }

    isInitialized = true;
  } catch (err) {
    console.error("[Sheets DB] Failed to initialize Google Sheets:", err);
  } finally {
    isInitializing = false;
  }
}

// ==========================================
// CORE DATABASE EXPORTS
// ==========================================

export function getDbMode() {
  return { isSimulated: false, isConfigured: hasGoogleCreds && !!sheetsClient };
}

// ------------------------------------------
// 1. STUDENTS
// ------------------------------------------
export async function getStudents(): Promise<{ data: Student[]; columns: string[] }> {
  if (!hasGoogleCreds || !sheetsClient) {
    return { data: [], columns: [] };
  }

  try {
    await initSheets();
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${studentSheetName}!A1:Z1000`,
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { data: [], columns: [] };
    }

    const headers = rows[0] as string[];
    const data: Student[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const student: any = {};
      headers.forEach((header, colIndex) => {
        student[header] = row[colIndex] !== undefined ? String(row[colIndex]) : "";
      });
      data.push(student as Student);
    }

    return { data, columns: headers };
  } catch (error) {
    console.error("[Sheets DB] Google Sheets getStudents error:", error);
    return { data: [], columns: [] };
  }
}

export async function updateStudentCell(
  id: string,
  column: string,
  newValue: string,
  actor: string,
  actorDisplayName: string,
  actorRole: string,
  ip: string = "127.0.0.1"
): Promise<void> {
  if (!hasGoogleCreds || !sheetsClient) {
    throw new Error("Cannot modify records: No Google Sheet configured.");
  }
  const timestamp = new Date().toISOString();

  try {
    await initSheets();
    // 1. Get current rows to find column index and row index of target ID
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${studentSheetName}!A1:Z1000`,
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error("No data in spreadsheet.");
    }

    const headers = rows[0] as string[];
    const colIndex = headers.indexOf(column);
    const idColIndex = headers.indexOf("ID");
    const lastModifiedByColIndex = headers.indexOf("LastModifiedBy");
    const lastModifiedAtColIndex = headers.indexOf("LastModifiedAt");

    if (colIndex === -1 || idColIndex === -1) {
      throw new Error(`Column ${column} or ID column not found.`);
    }

    let targetRowIndex = -1;
    let oldValue = "";

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idColIndex] === id) {
        targetRowIndex = i + 1; // 1-based, plus header offset
        oldValue = rows[i][colIndex] !== undefined ? String(rows[i][colIndex]) : "";
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error(`Student with ID ${id} not found.`);
    }

    // 2. Perform updates: target column, LastModifiedBy, LastModifiedAt
    const targetCellLetter = getColumnLetter(colIndex);
    const range = `${studentSheetName}!${targetCellLetter}${targetRowIndex}`;

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [[newValue]] },
    });

    if (lastModifiedByColIndex !== -1) {
      const byCellLetter = getColumnLetter(lastModifiedByColIndex);
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${studentSheetName}!${byCellLetter}${targetRowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [[actor]] },
      });
    }

    if (lastModifiedAtColIndex !== -1) {
      const atCellLetter = getColumnLetter(lastModifiedAtColIndex);
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${studentSheetName}!${atCellLetter}${targetRowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [[timestamp]] },
      });
    }

    // 3. Append Audit Log
    await appendAuditLog({
      timestamp,
      actor,
      actorDisplayName,
      actorRole,
      action: "WRITE",
      targetRow: id,
      columnChanged: column,
      oldValue,
      newValue,
      ip,
    });
  } catch (error) {
    console.error("[Sheets DB] Google Sheets updateStudentCell error:", error);
    throw error;
  }
}

export async function createStudent(
  newStudent: Student,
  actor: string,
  actorDisplayName: string,
  actorRole: string,
  ip: string = "127.0.0.1"
): Promise<void> {
  if (!hasGoogleCreds || !sheetsClient) {
    throw new Error("Cannot modify records: No Google Sheet configured.");
  }
  const timestamp = new Date().toISOString();
  newStudent.LastModifiedBy = actor;
  newStudent.LastModifiedAt = timestamp;

  try {
    await initSheets();

    // Uniqueness check
    const { data: students, columns: headers } = await getStudents();
    if (students.some((s) => s.ID === newStudent.ID)) {
      throw new Error(`Student ID "${newStudent.ID}" already exists.`);
    }

    // Map newStudent keys to spreadsheet column order
    const rowValues = headers.map((header) => {
      if (header === "LastModifiedBy") return actor;
      if (header === "LastModifiedAt") return timestamp;
      return newStudent[header as keyof Student] !== undefined ? String(newStudent[header as keyof Student]) : "";
    });

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${studentSheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [rowValues] },
    });

    // Append Audit Log
    await appendAuditLog({
      timestamp,
      actor,
      actorDisplayName,
      actorRole,
      action: "STUDENT_CREATE",
      targetRow: newStudent.ID,
      columnChanged: "all",
      oldValue: "",
      newValue: `Name=${newStudent.Name}, Email=${newStudent.Email}`,
      ip,
    });
  } catch (error: any) {
    console.error("[Sheets DB] Google Sheets createStudent error:", error);
    throw error;
  }
}

// ------------------------------------------
// 2. USERS
// ------------------------------------------
export async function getUsers(): Promise<User[]> {
  if (!hasGoogleCreds || !sheetsClient) {
    return [];
  }

  try {
    await initSheets();
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Users!A1:H100",
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0] as string[];
    const users: User[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const user: any = {};
      headers.forEach((header, colIndex) => {
        user[header] = row[colIndex] !== undefined ? String(row[colIndex]) : "";
      });
      users.push(user as User);
    }

    return users;
  } catch (error) {
    console.error("[Sheets DB] Google Sheets getUsers error:", error);
    return [];
  }
}

export async function createUser(
  newUser: User,
  actor: string,
  actorDisplayName: string,
  actorRole: string,
  ip: string = "127.0.0.1"
): Promise<void> {
  if (!hasGoogleCreds || !sheetsClient) {
    throw new Error("Cannot create user: No Google Sheet configured.");
  }
  const timestamp = new Date().toISOString();

  try {
    await initSheets();
    // Check uniqueness
    const users = await getUsers();
    if (users.some((u) => u.username === newUser.username)) {
      throw new Error(`Username "${newUser.username}" already exists.`);
    }

    const rowValues = [
      newUser.username,
      newUser.displayName,
      newUser.passwordHash,
      newUser.role,
      newUser.allowedColumns,
      newUser.isActive,
      newUser.createdAt,
      newUser.createdBy,
    ];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Users!A1",
      valueInputOption: "RAW",
      requestBody: { values: [rowValues] },
    });

    // Append Audit Log
    await appendAuditLog({
      timestamp,
      actor,
      actorDisplayName,
      actorRole,
      action: "USER_CREATE",
      targetRow: newUser.username,
      columnChanged: "all",
      oldValue: "",
      newValue: `displayName=${newUser.displayName}, allowedColumns=${newUser.allowedColumns}`,
      ip,
    });
  } catch (error: any) {
    console.error("[Sheets DB] Google Sheets createUser error:", error);
    throw error;
  }
}

export async function updateUser(
  username: string,
  updates: Partial<User>,
  actor: string,
  actorDisplayName: string,
  actorRole: string,
  ip: string = "127.0.0.1"
): Promise<void> {
  if (!hasGoogleCreds || !sheetsClient) {
    throw new Error("Cannot update user: No Google Sheet configured.");
  }
  const timestamp = new Date().toISOString();

  try {
    await initSheets();
    // 1. Find the target row index in sheets
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Users!A1:H100",
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error("No data in spreadsheet.");
    }

    const headers = rows[0] as string[];
    const userColIndex = headers.indexOf("username");

    let targetRowIndex = -1;
    let oldUser: any = {};

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][userColIndex] === username) {
        targetRowIndex = i + 1;
        headers.forEach((h, colIdx) => {
          oldUser[h] = rows[i][colIdx] !== undefined ? String(rows[i][colIdx]) : "";
        });
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error(`User "${username}" not found.`);
    }

    const changedFields: string[] = [];
    const oldVals: string[] = [];
    const newVals: string[] = [];

    // 2. Perform cell updates
    for (const key of Object.keys(updates)) {
      const colIdx = headers.indexOf(key);
      if (colIdx !== -1) {
        const uKey = key as keyof User;
        const val = updates[uKey];
        if (val !== undefined && String(val) !== String(oldUser[key])) {
          changedFields.push(key);
          oldVals.push(String(oldUser[key]));
          newVals.push(String(val));

          const letter = getColumnLetter(colIdx);
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `Users!${letter}${targetRowIndex}`,
            valueInputOption: "RAW",
            requestBody: { values: [[String(val)]] },
          });
        }
      }
    }

    if (changedFields.length === 0) {
      return;
    }

    let action: any = "USER_UPDATE";
    if (changedFields.includes("isActive")) {
      action = updates.isActive === "FALSE" ? "USER_DEACTIVATE" : "USER_ACTIVATE";
    }

    await appendAuditLog({
      timestamp,
      actor,
      actorDisplayName,
      actorRole,
      action,
      targetRow: username,
      columnChanged: changedFields.join(","),
      oldValue: oldVals.join(","),
      newValue: newVals.join(","),
      ip,
    });
  } catch (error) {
    console.error("[Sheets DB] Google Sheets updateUser error:", error);
    throw error;
  }
}

// ------------------------------------------
// 3. AUDIT LOGS
// ------------------------------------------
export async function getLogs(): Promise<AuditLog[]> {
  if (!hasGoogleCreds || !sheetsClient) {
    return [];
  }

  try {
    await initSheets();
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "AuditLogs!A1:J2000",
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0] as string[];
    const logs: AuditLog[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const log: any = {};
      headers.forEach((header, colIndex) => {
        log[header] = row[colIndex] !== undefined ? String(row[colIndex]) : "";
      });
      logs.push(log as AuditLog);
    }

    return logs;
  } catch (error) {
    console.error("[Sheets DB] Google Sheets getLogs error:", error);
    return [];
  }
}

export async function appendAuditLog(log: AuditLog): Promise<void> {
  if (!hasGoogleCreds || !sheetsClient) {
    return;
  }

  try {
    await initSheets();
    const rowValues = [
      log.timestamp,
      log.actor,
      log.actorDisplayName,
      log.actorRole,
      log.action,
      log.targetRow,
      log.columnChanged,
      log.oldValue,
      log.newValue,
      log.ip,
    ];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "AuditLogs!A1",
      valueInputOption: "RAW",
      requestBody: { values: [rowValues] },
    });
  } catch (error) {
    console.error("[Sheets DB] Google Sheets appendAuditLog error:", error);
  }
}
