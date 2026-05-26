import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const rowId = url.searchParams.get("rowId");
    const column = url.searchParams.get("column");

    if (!rowId || !column) {
      return NextResponse.json(
        { error: "rowId and column are required parameters." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const logs = await AuditLog.find({
      targetRow: rowId,
      columnChanged: column,
      action: "STUDENT_UPDATE"
    }).sort({ timestamp: -1 });

    const formattedLogs = logs.map((l: any) => ({
      timestamp: l.timestamp.toISOString(),
      actor: l.actor,
      actorDisplayName: l.actorDisplayName,
      actorRole: l.actorRole,
      oldValue: l.oldValue,
      newValue: l.newValue,
    }));

    return NextResponse.json({ logs: formattedLogs });
  } catch (error: any) {
    console.error("[GET /api/students/history] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch cell history" },
      { status: 500 }
    );
  }
}
