import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import * as xlsx from "xlsx";
import { fetchRawGoogleSheetsData, Student } from "../../../../lib/sheets";
import connectToDatabase from "../../../../lib/mongodb";
import SheetRow from "../../../../models/SheetRow";
import AuditLog from "../../../../models/AuditLog";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Only admins can import data." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const googleUrl = formData.get("googleUrl") as string | null;
    const sheetIdForImport = formData.get("sheetId") as string || "default";

    let parsedData: any[] = [];

    if (file) {
      const buffer = await file.arrayBuffer();
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".json")) {
        const text = new TextDecoder().decode(buffer);
        parsedData = JSON.parse(text);
      } else if (fileName.endsWith(".csv") || fileName.endsWith(".xlsx")) {
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        parsedData = xlsx.utils.sheet_to_json(worksheet);
      } else {
        return NextResponse.json({ error: "Unsupported file format. Please upload CSV, XLSX, or JSON." }, { status: 400 });
      }
    } else if (googleUrl) {
      const match = googleUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        const spreadsheetId = match[1];
        const result = await fetchRawGoogleSheetsData(spreadsheetId);
        parsedData = result.data;
      } else {
        const response = await fetch(googleUrl);
        if (!response.ok) {
           return NextResponse.json({ error: "Failed to fetch data from the provided URL." }, { status: 400 });
        }
        const buffer = await response.arrayBuffer();
        try {
          const workbook = xlsx.read(buffer, { type: "buffer" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedData = xlsx.utils.sheet_to_json(worksheet);
        } catch (e) {
           return NextResponse.json({ error: "Provided link is not a valid Google Sheet or Excel/CSV file." }, { status: 400 });
        }
      }
    } else {
      return NextResponse.json({ error: "No file or Google Sheets URL provided." }, { status: 400 });
    }

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return NextResponse.json({ error: "No data found to import." }, { status: 400 });
    }

    await connectToDatabase();

    let newCount = 0;
    let updateCount = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const item = parsedData[i];
      // Try to determine a unique ID
      const id = String(item["Student ID"] || item.ID || item.id || item.Id || `imported_row_${Date.now()}_${i}`);
      
      const existing = await SheetRow.findOne({ rowId: id, sheetId: sheetIdForImport });
      if (!existing) {
        await SheetRow.create({
          sheetId: sheetIdForImport,
          rowId: id,
          data: { ...item, ID: id },
          lastModifiedBy: session.user.username,
          lastModifiedAt: new Date()
        });
        newCount++;
      } else {
        // Prevent duplicate, just update the data
        existing.data = { ...existing.data, ...item, ID: id };
        existing.lastModifiedBy = session.user.username;
        existing.lastModifiedAt = new Date();
        existing.markModified("data");
        await existing.save();
        updateCount++;
      }
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    await AuditLog.create({
      timestamp: new Date(),
      actor: session.user.username,
      actorDisplayName: session.user.username,
      actorRole: session.user.role,
      action: "STUDENT_CREATE",
      targetRow: "multiple",
      ip,
      details: `Imported students data. New: ${newCount}, Updated: ${updateCount}`
    });

    return NextResponse.json({ 
      success: true, 
      message: `Import successful. Added ${newCount} new, updated ${updateCount} existing.` 
    });

  } catch (error: any) {
    console.error("[POST /api/students/import] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import students." },
      { status: 500 }
    );
  }
}
