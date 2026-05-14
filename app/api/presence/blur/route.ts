import { NextResponse } from "next/server";
import { broadcastSSE } from "@/lib/sse";

export async function POST(req: Request) {
  try {
    const { studentId, col, user } = await req.json();

    if (!studentId || !col || !user) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    broadcastSSE({
      type: "cell_blur",
      studentId,
      col,
      user,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
