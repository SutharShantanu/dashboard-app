import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { sseManager } from "../../../../lib/sse";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId, col, user, color } = await req.json();

    // Broadcast cell focus event
    sseManager.broadcast({
      type: "cell_focus",
      payload: { studentId, col, user, color }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/presence/focus] Error:", error);
    return NextResponse.json({ error: "Failed to broadcast focus" }, { status: 500 });
  }
}
