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
    const hasConnectedSheets = sheetNames.includes("ConnectedSpreadsheets");

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
    if (!hasConnectedSheets) {
      requests.push({
        addSheet: {
          properties: { title: "ConnectedSpreadsheets" },
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

    // Seed default ConnectedSpreadsheets if we had to create it
    if (!hasConnectedSheets) {
      const headers = [
        "spreadsheetId",
        "title",
        "sheetName",
        "url",
        "addedBy",
        "createdAt",
      ];
      const primarySheetRow = [
        sheetId,
        "Primary Student DB",
        studentSheetName,
        `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        "system",
        new Date().toISOString(),
      ];
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "ConnectedSpreadsheets!A1:F2",
        valueInputOption: "RAW",
        requestBody: {
          values: [headers, primarySheetRow],
        },
      });
      console.log("[Sheets DB] Seeded default primary sheet in ConnectedSpreadsheets.");
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
// MULTI-SHEET TAB MANAGEMENT
// ------------------------------------------

export interface ConnectedSheet {
  spreadsheetId: string;
  title: string;
  sheetName: string;
  url: string;
  addedBy: string;
  createdAt: string;
}

export async function getConnectedSheets(): Promise<ConnectedSheet[]> {
  if (!hasGoogleCreds || !sheetsClient) {
    return [
      {
        spreadsheetId: sheetId,
        title: "Primary Student DB",
        sheetName: studentSheetName,
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        addedBy: "system",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  try {
    await initSheets();
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "ConnectedSpreadsheets!A1:F100",
    });
    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return [
        {
          spreadsheetId: sheetId,
          title: "Primary Student DB",
          sheetName: studentSheetName,
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
          addedBy: "system",
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const result: ConnectedSheet[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      result.push({
        spreadsheetId: r[0] || "",
        title: r[1] || "",
        sheetName: r[2] || "",
        url: r[3] || "",
        addedBy: r[4] || "",
        createdAt: r[5] || "",
      });
    }
    return result;
  } catch (error) {
    console.error("[Sheets DB] getConnectedSheets error:", error);
    return [
      {
        spreadsheetId: sheetId,
        title: "Primary Student DB",
        sheetName: studentSheetName,
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        addedBy: "system",
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

export async function addConnectedSheet(url: string, title: string, addedBy: string): Promise<ConnectedSheet> {
  if (!hasGoogleCreds || !sheetsClient) {
    throw new Error("Cannot connect external sheet: No Google Sheet configured.");
  }

  let targetSpreadsheetId = "";
  try {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      targetSpreadsheetId = match[1];
    } else {
      throw new Error("Invalid Google Sheet URL. Could not extract spreadsheet ID.");
    }
  } catch {
    throw new Error("Invalid Google Sheet URL structure.");
  }

  try {
    await initSheets();
    const existing = await getConnectedSheets();
    if (existing.some((s) => s.spreadsheetId === targetSpreadsheetId)) {
      throw new Error(`Google Sheet is already connected.`);
    }

    // Verify access and get sheet metadata
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: targetSpreadsheetId,
    });

    const sheets = response.data.sheets || [];
    if (sheets.length === 0) {
      throw new Error("Google Sheet has no visible tabs.");
    }

    const sheetName = sheets[0].properties?.title || "Sheet1";
    const finalTitle = title.trim() || response.data.properties?.title || "Connected Sheet";
    const createdAt = new Date().toISOString();

    const rowValues = [
      targetSpreadsheetId,
      finalTitle,
      sheetName,
      url.trim(),
      addedBy,
      createdAt,
    ];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "ConnectedSpreadsheets!A1",
      valueInputOption: "RAW",
      requestBody: { values: [rowValues] },
    });

    console.log(`[Sheets DB] Connected new external sheet: ${finalTitle}`);

    return {
      spreadsheetId: targetSpreadsheetId,
      title: finalTitle,
      sheetName,
      url: url.trim(),
      addedBy,
      createdAt,
    };
  } catch (error: any) {
    console.error("[Sheets DB] addConnectedSheet error:", error);
    const msg = error.message || "";
    if (msg.includes("Office file") || msg.includes("not supported for this document")) {
      throw new Error("Google Sheets API v4 does not support direct manipulation of Excel (.xlsx) binary files. To connect this file, please open it in Google Sheets and click 'File > Save as Google Sheets', then paste the new URL here!");
    }
    throw new Error(msg || "Failed to verify or connect external Google Sheet. Ensure the service account email has Viewer or Editor permissions on the sheet.");
  }
}

export async function removeConnectedSheet(targetSpreadsheetId: string): Promise<void> {
  if (!hasGoogleCreds || !sheetsClient) {
    throw new Error("Cannot remove sheet: No Google Sheet configured.");
  }
  if (targetSpreadsheetId === sheetId) {
    throw new Error("Cannot remove the primary student database.");
  }

  try {
    await initSheets();
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "ConnectedSpreadsheets!A1:F100",
    });
    const rows = response.data.values;
    if (!rows || rows.length < 2) return;

    const headers = rows[0];
    const remainingRows = rows.slice(1).filter((r: any) => r[0] !== targetSpreadsheetId);

    await sheetsClient.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: "ConnectedSpreadsheets!A1:F100",
    });

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "ConnectedSpreadsheets!A1",
      valueInputOption: "RAW",
      requestBody: { values: [headers, ...remainingRows] },
    });

    console.log(`[Sheets DB] Removed connected sheet: ${targetSpreadsheetId}`);
  } catch (error) {
    console.error("[Sheets DB] removeConnectedSheet error:", error);
    throw new Error("Failed to remove connected sheet.");
  }
}

export async function getSheetNames(): Promise<string[]> {
  if (!hasGoogleCreds || !sheetsClient) {
    return ["Students"];
  }
  try {
    await initSheets();
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    const sheets = response.data.sheets || [];
    const names = sheets
      .map((s: any) => s.properties?.title || "")
      .filter((n: string) => n && n !== "Users" && n !== "AuditLogs" && n !== "ConnectedSpreadsheets");
    return names.length > 0 ? names : ["Students"];
  } catch (error) {
    console.error("[Sheets DB] getSheetNames error:", error);
    return ["Students"];
  }
}

export async function addSheetTab(title: string): Promise<void> {
  if (!hasGoogleCreds || !sheetsClient) {
    throw new Error("Cannot add sheet: No Google Sheet configured.");
  }
  try {
    await initSheets();
    const existing = await getSheetNames();
    if (existing.some((n) => n.toLowerCase() === title.toLowerCase())) {
      throw new Error(`Sheet tab "${title}" already exists.`);
    }

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title },
            },
          },
        ],
      },
    });

    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Course",
      "Batch",
      "Status",
      "Score",
      "Remarks",
      "Grade",
      "Comments",
      "Notes",
      "LastModifiedBy",
      "LastModifiedAt",
    ];

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${title}!A1:N1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [headers],
      },
    });

    console.log(`[Sheets DB] Added new sheet tab: ${title} with headers.`);
  } catch (error) {
    console.error("[Sheets DB] addSheetTab error:", error);
    throw error;
  }
}

// ------------------------------------------
// 1. STUDENTS
// ------------------------------------------
export async function getStudents(targetSheet?: string, targetSpreadsheetId?: string): Promise<{ data: Student[]; columns: string[] }> {
  if (!hasGoogleCreds || !sheetsClient) {
    return { data: [], columns: [] };
  }

  try {
    await initSheets();
    const activeSpreadsheetId = targetSpreadsheetId || sheetId;
    const sheetToFetch = targetSheet || (targetSpreadsheetId ? "Sheet1" : studentSheetName);
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: activeSpreadsheetId,
      range: `${sheetToFetch}!A1:Z1000`,
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
      if (!student.ID) {
        student.ID = `row_${i + 1}`;
      }
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
  ip: string = "127.0.0.1",
  targetSheet?: string,
  targetSpreadsheetId?: string
): Promise<void> {
  if (!hasGoogleCreds || !sheetsClient) {
    throw new Error("Cannot modify records: No Google Sheet configured.");
  }
  const timestamp = new Date().toISOString();

  try {
    await initSheets();
    const activeSpreadsheetId = targetSpreadsheetId || sheetId;
    const sheetToFetch = targetSheet || (targetSpreadsheetId ? "Sheet1" : studentSheetName);
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: activeSpreadsheetId,
      range: `${sheetToFetch}!A1:Z1000`,
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

    if (colIndex === -1) {
      throw new Error(`Column ${column} not found.`);
    }

    let targetRowIndex = -1;
    let oldValue = "";

    for (let i = 1; i < rows.length; i++) {
      const rowId = idColIndex !== -1 && rows[i][idColIndex] ? String(rows[i][idColIndex]) : `row_${i + 1}`;
      if (rowId === id) {
        targetRowIndex = i + 1; // 1-based, plus header offset
        oldValue = rows[i][colIndex] !== undefined ? String(rows[i][colIndex]) : "";
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error(`Student with ID ${id} not found.`);
    }

    const targetCellLetter = getColumnLetter(colIndex);
    const range = `${sheetToFetch}!${targetCellLetter}${targetRowIndex}`;

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: activeSpreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [[newValue]] },
    });

    if (lastModifiedByColIndex !== -1) {
      const byCellLetter = getColumnLetter(lastModifiedByColIndex);
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: activeSpreadsheetId,
        range: `${sheetToFetch}!${byCellLetter}${targetRowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [[actor]] },
      });
    }

    if (lastModifiedAtColIndex !== -1) {
      const atCellLetter = getColumnLetter(lastModifiedAtColIndex);
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: activeSpreadsheetId,
        range: `${sheetToFetch}!${atCellLetter}${targetRowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [[timestamp]] },
      });
    }

    // Append Audit Log
    await appendAuditLog({
      timestamp,
      actor,
      actorDisplayName,
      actorRole,
      action: "WRITE",
      targetRow: `${sheetToFetch}:${id}`,
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
  ip: string = "127.0.0.1",
  targetSheet?: string,
  targetSpreadsheetId?: string
): Promise<void> {
  if (!hasGoogleCreds || !sheetsClient) {
    throw new Error("Cannot modify records: No Google Sheet configured.");
  }
  const timestamp = new Date().toISOString();
  newStudent.LastModifiedBy = actor;
  newStudent.LastModifiedAt = timestamp;

  try {
    await initSheets();
    const activeSpreadsheetId = targetSpreadsheetId || sheetId;
    const sheetToFetch = targetSheet || (targetSpreadsheetId ? "Sheet1" : studentSheetName);

    // Uniqueness check
    const { data: students, columns: headers } = await getStudents(sheetToFetch, activeSpreadsheetId);
    if (students.some((s) => s.ID === newStudent.ID)) {
      throw new Error(`Student ID "${newStudent.ID}" already exists in sheet ${sheetToFetch}.`);
    }

    const rowValues = headers.map((header) => {
      if (header === "LastModifiedBy") return actor;
      if (header === "LastModifiedAt") return timestamp;
      return newStudent[header as keyof Student] !== undefined ? String(newStudent[header as keyof Student]) : "";
    });

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: activeSpreadsheetId,
      range: `${sheetToFetch}!A1`,
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
      targetRow: `${sheetToFetch}:${newStudent.ID}`,
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
