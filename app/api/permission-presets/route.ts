import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import connectToDatabase from "../../../lib/mongodb";
import PermissionPreset from "../../../models/PermissionPreset";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins only" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const presets = await PermissionPreset.find({});
    return NextResponse.json({ presets });
  } catch (error: any) {
    console.error("[GET /api/permission-presets] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch presets" },
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
        { error: "Forbidden: Admins only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Check if name already exists
    const existing = await PermissionPreset.findOne({ name });
    if (existing) {
      return NextResponse.json(
        { error: "Preset with this name already exists" },
        { status: 400 }
      );
    }

    const newPreset = await PermissionPreset.create({
      name,
      description,
      permissions: permissions || {},
      createdBy: session.user.username,
    });

    return NextResponse.json({ success: true, preset: newPreset }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/permission-presets] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create preset" },
      { status: 500 }
    );
  }
}
