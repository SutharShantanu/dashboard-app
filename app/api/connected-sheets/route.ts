import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getConnectedSheets, addConnectedSheet } from "../../../lib/sheets";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectedSheets = await getConnectedSheets();
    return NextResponse.json({ connectedSheets });
  } catch (error: any) {
    console.error("[GET /api/connected-sheets] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch connected sheets." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can connect external Google Sheets." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { url, title } = body;

    if (!url || !url.trim()) {
      return NextResponse.json(
        { error: "Google Sheet URL is required." },
        { status: 400 }
      );
    }

    const newSheet = await addConnectedSheet(
      url.trim(),
      title || "Connected Sheet",
      session.user.username
    );

    return NextResponse.json({ success: true, newSheet });
  } catch (error: any) {
    console.error("[POST /api/connected-sheets] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to connect Google Sheet." },
      { status: 500 }
    );
  }
}
