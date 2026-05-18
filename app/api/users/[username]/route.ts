import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { updateUser, User, getStudents, getUsers } from "../../../../lib/sheets";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: Request,
  context: any
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

    const resolvedParams = await context.params;
    const { username } = resolvedParams;
    const body = await request.json();
    const updates: Partial<User> = {};

    if (body.displayName !== undefined) updates.displayName = String(body.displayName).trim();
    if (body.isActive !== undefined) updates.isActive = body.isActive === "FALSE" ? "FALSE" : "TRUE";
    if (body.role !== undefined) updates.role = body.role === "admin" ? "admin" : "sub-admin";
    if (body.permissionPreset !== undefined) updates.permissionPreset = body.permissionPreset;
    if (body.perSheetPermissions !== undefined) updates.perSheetPermissions = body.perSheetPermissions;

    if (body.email !== undefined) updates.email = String(body.email).trim();

    if (body.allowedColumns !== undefined) {
      updates.allowedColumns = String(body.allowedColumns).trim();
    }

    if (body.password) {
      updates.passwordHash = await bcrypt.hash(body.password, 12);
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "127.0.0.1";

    await updateUser(
      username.toLowerCase(),
      updates,
      session.user.username,
      session.user.role,
      ip
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PATCH /api/users/[username]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
