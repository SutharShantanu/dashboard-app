import connectToDatabase from "../mongodb";
import SheetRow from "../../models/SheetRow";
import ConnectedSheet from "../../models/ConnectedSheet";
import { sseManager } from "../sse";
import { appendAuditLog } from "./audit.service";
import { fetchRawGoogleSheetsData } from "./google-sheets.service";
import type { Student } from "../sheets";

const DEFAULT_COLUMNS = [
  "ID",
  "Name",
  "Email",
  "Phone",
  "Course",
  "Batch",
  "Status",
  "Score",
  "Grade",
  "Comments",
  "Notes",
  "LastModifiedBy",
  "LastModifiedAt",
  "Remarks",
];

export async function syncSheetData(spreadsheetId: string): Promise<void> {
  await connectToDatabase();
  const connectedSheet = await ConnectedSheet.findOne({ spreadsheetId });
  if (!connectedSheet) throw new Error("Connected sheet not found");

  const { data } = await fetchRawGoogleSheetsData(
    spreadsheetId,
    `${connectedSheet.sheetName}!A:AZ`
  );

  for (const item of data) {
    const id = String(
      item.ID ||
        item.id ||
        item.Id ||
        (item.__rowIndex ? `row_${item.__rowIndex}` : Object.values(item)[0])
    );
    if (!id) continue;

    const existing = await SheetRow.findOne({ rowId: id, sheetId: spreadsheetId });
    if (!existing) {
      await SheetRow.create({
        sheetId: spreadsheetId,
        rowId: id,
        data: item,
        lastModifiedBy: "system",
        lastModifiedAt: new Date(),
      });
    } else if (existing.lastModifiedBy === "system") {
      existing.data = item;
      existing.lastModifiedAt = new Date();
      existing.markModified("data");
      await existing.save();
    }
  }
}

export async function getStudents(
  sheetName: string = "Students",
  spreadsheetId?: string
): Promise<{ data: Student[]; columns: string[] }> {
  await connectToDatabase();
  const targetSheetId = spreadsheetId || "default";

  let rows;
  if (targetSheetId === "all") {
    rows = await SheetRow.find({});
  } else {
    rows = await SheetRow.find({ sheetId: targetSheetId });
    // Explicit sync-on-read: only triggered when no cached rows exist for a real spreadsheetId
    if (rows.length === 0 && spreadsheetId && spreadsheetId !== "default") {
      try {
        await syncSheetData(spreadsheetId);
        rows = await SheetRow.find({ sheetId: targetSheetId });
      } catch (e) {
        console.error("Failed to sync on load:", e);
      }
    }
  }

  const data = rows.map((r) => ({
    ...r.data,
    ID: r.rowId,
    LastModifiedBy: r.lastModifiedBy,
    LastModifiedAt: r.lastModifiedAt.toISOString(),
  })) as Student[];

  const columnsSet = new Set<string>();
  rows.forEach((r) => {
    if (r.data) Object.keys(r.data).forEach((k) => columnsSet.add(k));
  });
  const columns = columnsSet.size > 0 ? Array.from(columnsSet) : DEFAULT_COLUMNS;
  const finalColumns = [...columns];
  if (!finalColumns.includes("ID")) finalColumns.unshift("ID");
  if (!finalColumns.includes("LastModifiedBy")) finalColumns.push("LastModifiedBy");
  if (!finalColumns.includes("LastModifiedAt")) finalColumns.push("LastModifiedAt");

  return { data, columns: finalColumns };
}

export async function createStudent(
  student: Student,
  actor: string = "system",
  actorRole: string = "system",
  ip: string = "127.0.0.1",
  sheetName: string = "Students",
  spreadsheetId?: string
): Promise<void> {
  await connectToDatabase();
  const targetSheetId = spreadsheetId || "default";

  await SheetRow.create({
    rowId: student.ID,
    sheetId: targetSheetId,
    data: student,
    lastModifiedBy: actor,
    lastModifiedAt: new Date(),
  });

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    actorDisplayName: actor,
    actorRole,
    action: "STUDENT_CREATE",
    targetRow: student.ID,
    ip,
    details: `Created student record: ${student.Name} (${student.ID})`,
  });

  sseManager.broadcast({ type: "cell_update", payload: { id: student.ID, data: student } });
}

export async function updateStudentCell(
  id: string,
  column: string,
  newValue: string,
  actor: string = "system",
  actorRole: string = "system",
  ip: string = "127.0.0.1",
  sheetName: string = "Students",
  spreadsheetId?: string
): Promise<void> {
  await connectToDatabase();
  const targetSheetId = spreadsheetId || "default";

  const row = await SheetRow.findOne({ rowId: id, sheetId: targetSheetId });
  if (!row) throw new Error("Student record not found");

  const oldValue = row.data[column] || "";

  if (String(oldValue).trim() === String(newValue).trim()) {
    return; // Do nothing if the value hasn't changed
  }

  row.data[column] = newValue.trim();
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
    details: `Updated ${column} for student ${id}`,
  });

  sseManager.broadcast({
    type: "cell_update",
    payload: {
      id,
      column,
      value: newValue,
      lastModifiedBy: actor,
      lastModifiedAt: row.lastModifiedAt.toISOString(),
    },
  });
}
