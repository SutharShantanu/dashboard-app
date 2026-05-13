import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getSheetNames, addSheetTab } from "../../../lib/sheets";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sheets = await getSheetNames();
    return NextResponse.json({ sheets });
  } catch (error: any) {
    console.error("[GET /api/sheets] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch sheet names." },
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
        { error: "Forbidden: Only admins can add new sheet tabs." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Sheet title is required." },
        { status: 400 }
      );
    }

    await addSheetTab(title.trim());

    return NextResponse.json({ success: true, title: title.trim() });
  } catch (error: any) {
    console.error("[POST /api/sheets] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create sheet tab." },
      { status: 500 }
    );
  }
}
