import { NextRequest, NextResponse } from "next/server";
import { getStudents, updateStudentCell } from "../../../lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    
    // In a real application, you would compare this against a strong secret from process.env
    // e.g. process.env.SHEET_WEBHOOK_SECRET
    if (authHeader !== `Bearer ${process.env.SHEET_WEBHOOK_SECRET || "default_secret"}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sheetName, row, col, oldValue, newValue } = body;

    // Google Sheets apps script will send 1-indexed row and col
    // We need to map this back to our schema (ID, column name)
    const { data, columns } = await getStudents(sheetName);

    // Row 1 is headers. So row 2 corresponds to data[0].
    const student = data[row - 2]; 
    if (!student) {
       return NextResponse.json({ error: "Student row not found" }, { status: 404 });
    }

    // Col 1 is columns[0]
    const columnName = columns[col - 1];
    if (!columnName) {
       return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // Update in MongoDB and broadcast to SSE (via updateStudentCell)
    await updateStudentCell(
      student.ID,
      columnName,
      String(newValue || ""),
      "google-sheets-sync", // actor
      "webhook" // ip
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/sheet-webhook] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
