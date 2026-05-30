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

    const { studentId, col, user } = await req.json();

    // Broadcast cell blur event
    sseManager.broadcast({
      type: "cell_blur",
      payload: { studentId, col, user }
    });

    await sseManager.updatePresence(session.user.username, null);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/presence/blur] Error:", error);
    return NextResponse.json({ error: "Failed to broadcast blur" }, { status: 500 });
  }
}
