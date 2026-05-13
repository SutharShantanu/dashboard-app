import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getLogs } from "../../../lib/sheets";

// GET: Retrieves system audit logs (Admin Only)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can view audit logs." },
        { status: 403 }
      );
    }

    const logs = await getLogs();

    // Sort logs descending by timestamp to show latest edits first
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ logs: sortedLogs });
  } catch (error: any) {
    console.error("[GET /api/logs] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs." },
      { status: 500 }
    );
  }
}
