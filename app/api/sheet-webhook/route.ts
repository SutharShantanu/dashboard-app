import { NextResponse } from "next/server";
import { broadcastSSE } from "@/lib/sse";

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-webhook-secret");
    // Verify webhook secret if configured
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized webhook access" }, { status: 401 });
    }

    const payload = await req.json();
    const { range, sheetName, oldValue, newValue, row, col, timestamp, studentId, colName } = payload;

    // Broadcast cell update via SSE to all dashboard clients
    broadcastSSE({
      type: "cell_update",
      studentId: studentId || `row_${row}`,
      col: colName || `Col_${col}`,
      value: newValue ?? "",
      by: "Google Sheets Apps Script",
      sheet: sheetName,
    });

    return NextResponse.json({ success: true, broadcasted: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process webhook" }, { status: 500 });
  }
}
