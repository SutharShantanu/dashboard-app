import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getLogs } from "../../../lib/sheets";

// GET: Retrieves audit logs
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const selfOnly = searchParams.get("self") === "true";
    const type = searchParams.get("type");

    const logs = await getLogs();

    let filteredLogs = logs;
    const userObj = session.user as any;
    
    if (userObj.role !== "admin" || selfOnly) {
      filteredLogs = filteredLogs.filter(l => l.actor === userObj.username);
    }

    if (type === "sheet") {
      filteredLogs = filteredLogs.filter(
        l => !["LOGIN", "LOGOUT", "USER_CREATE", "USER_UPDATE", "USER_DEACTIVATE", "USER_ACTIVATE", "USER_DELETE"].includes(l.action)
      );
    }

    // Sort logs descending by timestamp to show latest edits first
    const sortedLogs = [...filteredLogs].sort(
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
