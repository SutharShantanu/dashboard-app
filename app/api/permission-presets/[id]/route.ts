import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import connectToDatabase from "../../../../lib/mongodb";
import PermissionPreset from "../../../../models/PermissionPreset";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { name, description, permissions } = body;

    await connectToDatabase();
    
    const preset = await PermissionPreset.findById(id);
    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    }

    if (name) preset.name = name;
    if (description !== undefined) preset.description = description;
    if (permissions) preset.permissions = permissions;

    await preset.save();

    return NextResponse.json({ success: true, preset });
  } catch (error: any) {
    console.error("[PUT /api/permission-presets/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update preset" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    await connectToDatabase();
    
    const result = await PermissionPreset.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/permission-presets/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete preset" },
      { status: 500 }
    );
  }
}
