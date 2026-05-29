import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "../../../lib/mongodb";
import ConnectedSheet from "../../../models/ConnectedSheet";
import { getStudents, updateStudentCell } from "../../../lib/sheets";

export async function POST(req: NextRequest) {
  // Fail closed: refuse if the secret is not configured
  const webhookSecret = process.env.SHEET_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[POST /api/sheet-webhook] SHEET_WEBHOOK_SECRET is not set — rejecting all requests");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const secretHeader = req.headers.get("x-webhook-secret");
  if (secretHeader !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sheetName, spreadsheetId: payloadSpreadsheetId, row, col, newValue } = body;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

    // Resolve the target ConnectedSheet so SheetRow.sheetId matches
    await connectToDatabase();
    let targetSpreadsheetId: string | undefined;

    if (payloadSpreadsheetId) {
      const sheet = await ConnectedSheet.findOne({ spreadsheetId: payloadSpreadsheetId });
      // Reject updates for spreadsheets not connected to this dashboard
      targetSpreadsheetId = sheet?.spreadsheetId;
    } else if (sheetName) {
      // Fallback: resolve by sheetName (works when only one sheet uses this name)
      const sheet = await ConnectedSheet.findOne({ sheetName });
      targetSpreadsheetId = sheet?.spreadsheetId;
    }

    if (!targetSpreadsheetId) {
      return NextResponse.json({ error: "Could not resolve connected sheet" }, { status: 404 });
    }

    const { data, columns } = await getStudents(sheetName, targetSpreadsheetId);

    // row is 1-indexed; row 1 is headers, so row 2 → data[0]
    const student = data[row - 2];
    if (!student) {
      return NextResponse.json({ error: "Student row not found" }, { status: 404 });
    }

    // col is 1-indexed
    const columnName = columns[col - 1];
    if (!columnName) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    await updateStudentCell(
      student.ID,
      columnName,
      String(newValue ?? ""),
      "google-sheets-sync",
      "webhook",
      ip,
      sheetName,
      targetSpreadsheetId
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[POST /api/sheet-webhook] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
