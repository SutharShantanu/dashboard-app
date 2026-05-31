import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { sseManager } from "../../../../lib/sse";
import { rateLimit } from "../../../../lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rl = await rateLimit(`presence_focus:${ip}`, 120, 60); // 120 focus events/min per IP
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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

    await sseManager.updatePresence(session.user.username, `${studentId}:${col}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/presence/focus] Error:", error);
    return NextResponse.json({ error: "Failed to broadcast focus" }, { status: 500 });
  }
}
