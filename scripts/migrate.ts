import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { initSheets, fetchRawGoogleSheetsData, getUsers, getLogs, getConnectedSheets } from "../lib/sheets";
import connectToDatabase from "../lib/mongodb";
import User from "../models/User";
import AuditLog from "../models/AuditLog";
import SheetRow from "../models/SheetRow";
import ConnectedSheet from "../models/ConnectedSheet";

async function migrate() {
  console.log("Starting Migration to MongoDB...");
  await connectToDatabase();

  console.log("Connected to MongoDB.");
  
  await initSheets();

  // 1. Migrate Users
  console.log("Migrating Users...");
  const users = await getUsers();
  for (const user of users) {
    const existing = await User.findOne({ username: user.username });
    if (!existing) {
      await User.create({
        username: user.username,
        displayName: user.displayName,
        email: user.email || `${user.username}@placeholder.com`,
        passwordHash: user.passwordHash,
        role: user.role,
        allowedColumns: user.allowedColumns,
        isActive: user.isActive === "TRUE",
        createdAt: new Date(user.createdAt || Date.now()),
        createdBy: user.createdBy,
        otpCode: user.otpCode,
        otpExpiry: user.otpExpiry ? new Date(user.otpExpiry) : undefined,
      });
      console.log(`Migrated user: ${user.username}`);
    }
  }

  // 2. Migrate Audit Logs
  console.log("Migrating Audit Logs...");
  const logs = await getLogs();
  for (const log of logs) {
    const existing = await AuditLog.findOne({ timestamp: new Date(log.timestamp), actor: log.actor });
    if (!existing) {
      await AuditLog.create({
        timestamp: new Date(log.timestamp),
        actor: log.actor,
        actorDisplayName: log.actorDisplayName,
        actorRole: log.actorRole,
        action: log.action,
        targetRow: log.targetRow,
        details: `Column: ${log.columnChanged || ''}, Old: ${log.oldValue || ''}, New: ${log.newValue || ''}, IP: ${log.ip || ''}`,
      });
    }
  }
  console.log(`Migrated ${logs.length} Audit Logs.`);

  // 3. Migrate Students (Sheet Rows)
  console.log("Migrating Sheet Rows...");
  let sheets = await getConnectedSheets();
  
  if (sheets.length === 0 && process.env.GOOGLE_SHEET_ID) {
    console.log("No connected sheets found in DB. Using default GOOGLE_SHEET_ID from .env.");
    sheets = [{
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      title: "Primary Student DB",
      sheetName: "Students",
      url: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`,
      addedBy: "system",
      createdAt: new Date().toISOString()
    }];
  }
  
  // Migrate connected sheets themselves
  console.log("Migrating Connected Sheets definitions...");
  for (const sheet of sheets) {
    const existingSheet = await ConnectedSheet.findOne({ spreadsheetId: sheet.spreadsheetId });
    if (!existingSheet) {
      await ConnectedSheet.create({
        spreadsheetId: sheet.spreadsheetId,
        title: sheet.title,
        sheetName: sheet.sheetName,
        url: sheet.url,
        addedBy: sheet.addedBy || 'system',
        createdAt: new Date(sheet.createdAt || Date.now())
      });
    }
  }

  for (const sheet of sheets) {
    console.log(`Migrating data for sheet: ${sheet.title} (${sheet.spreadsheetId}) - Tab: ${sheet.sheetName}`);
    const { data } = await fetchRawGoogleSheetsData(sheet.spreadsheetId, sheet.sheetName);
    
    for (const row of data) {
      const existing = await SheetRow.findOne({ sheetId: sheet.spreadsheetId, rowId: row.ID });
      if (!existing) {
        await SheetRow.create({
          rowId: row.ID,
          sheetId: sheet.spreadsheetId,
          data: row,
          lastModifiedBy: row.LastModifiedBy || 'system',
          lastModifiedAt: new Date(row.LastModifiedAt || Date.now())
        });
      }
    }
    console.log(`Migrated ${data.length} rows for sheet ${sheet.title}.`);
  }

  console.log("Migration Complete!");
  process.exit(0);
}

migrate().catch(console.error);
