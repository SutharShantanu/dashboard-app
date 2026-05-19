import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { updateUser, User, getStudents, getUsers, deleteUser } from "../../../../lib/sheets";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: any
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const { username } = resolvedParams;

    const userRole = (session.user as any).role;
    const currentUsername = session.user.username;
    const isSelfUpdate = currentUsername.toLowerCase() === username.toLowerCase();

    if (!isSelfUpdate && currentUsername !== "SabaAdmin" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can manage other users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Partial<User> = {};

    // Standard admin boundaries check
    if (!isSelfUpdate && currentUsername !== "SabaAdmin") {
      const users = await getUsers();
      const targetUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (targetUser.role === "admin" || targetUser.username.toLowerCase() === "sabaadmin") {
        return NextResponse.json(
          { error: "Forbidden: Standard admins can only modify sub-admin users" },
          { status: 403 }
        );
      }

      if (body.role !== undefined && body.role !== "sub-admin") {
        return NextResponse.json(
          { error: "Forbidden: Standard admins cannot change user roles" },
          { status: 403 }
        );
      }
    }

    // SabaAdmin protection checks
    if (username.toLowerCase() === "sabaadmin") {
      if (body.role !== undefined && body.role !== "admin") {
        return NextResponse.json(
          { error: "Forbidden: SabaAdmin's role must always remain 'admin'" },
          { status: 403 }
        );
      }
      if (body.isActive !== undefined && body.isActive !== "TRUE") {
        return NextResponse.json(
          { error: "Forbidden: SabaAdmin must always remain active" },
          { status: 403 }
        );
      }
    }

    if (isSelfUpdate) {
      if (username.toLowerCase() === "sabaadmin") {
        // SabaAdmin self-update: can update displayName, email, and password.
        if (body.displayName !== undefined) {
          updates.displayName = String(body.displayName).trim();
        }
        if (body.email !== undefined) {
          updates.email = String(body.email).trim();
        }
        if (body.password) {
          updates.passwordHash = await bcrypt.hash(body.password, 12);
        }
      } else {
        // Standard user self-update: Only displayName is permitted. Ignore other keys.
        if (body.displayName !== undefined) {
          updates.displayName = String(body.displayName).trim();
        }
      }
    } else {
      // Must be SabaAdmin or standard admin modifying another user (sub-admin)
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

export async function DELETE(
  request: Request,
  context: any
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const { username } = resolvedParams;

    const userRole = (session.user as any).role;
    const currentUsername = session.user.username;
    const isSelfDelete = currentUsername.toLowerCase() === username.toLowerCase();

    // 1. Forbidden: SabaAdmin cannot be deleted by anyone
    if (username.toLowerCase() === "sabaadmin") {
      return NextResponse.json(
        { error: "Forbidden: SabaAdmin account cannot be deleted" },
        { status: 403 }
      );
    }

    // 2. Forbidden: users cannot delete themselves
    if (isSelfDelete) {
      return NextResponse.json(
        { error: "Forbidden: You cannot delete your own active account" },
        { status: 403 }
      );
    }

    // 3. Forbidden: standard users cannot delete users (only admin or SabaAdmin can)
    if (currentUsername !== "SabaAdmin" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can delete users" },
        { status: 403 }
      );
    }

    // Fetch the target user to inspect role properties
    const users = await getUsers();
    const targetUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 4. Forbidden: Standard admins can only delete sub-admin accounts
    if (currentUsername !== "SabaAdmin") {
      if (targetUser.role === "admin" || targetUser.username.toLowerCase() === "sabaadmin") {
        return NextResponse.json(
          { error: "Forbidden: Standard admins can only delete sub-admin users" },
          { status: 403 }
        );
      }
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "127.0.0.1";

    await deleteUser(
      username.toLowerCase(),
      session.user.username,
      session.user.role,
      ip
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/users/[username]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
