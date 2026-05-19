import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getUsers, createUser, User, getStudents } from "../../../lib/sheets";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const currentUsername = session.user.username;

    if (currentUsername !== "SabaAdmin" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can manage the user directory" },
        { status: 403 }
      );
    }

    const users = await getUsers();
    const safeUsers = users.map(({ passwordHash, ...u }) => u);
    return NextResponse.json({ users: safeUsers });
  } catch (error: any) {
    console.error("[GET /api/users] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
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

    const userRole = (session.user as any).role;
    const currentUsername = session.user.username;

    if (currentUsername !== "SabaAdmin" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can manage the user directory" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, displayName, email, password, role, allowedColumns, permissionPreset, perSheetPermissions } = body;

    if (!username || !displayName || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields (username, displayName, password, role)" },
        { status: 400 }
      );
    }

    if (currentUsername !== "SabaAdmin" && role !== "sub-admin") {
      return NextResponse.json(
        { error: "Forbidden: Standard admins can only create 'sub-admin' users" },
        { status: 403 }
      );
    }

    const targetRole = role === "admin" ? "admin" : "sub-admin";

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser: User = {
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      email: email ? email.trim() : "",
      passwordHash,
      role: role === "admin" ? "admin" : "sub-admin",
      allowedColumns: allowedColumns || "",
      permissionPreset: permissionPreset,
      perSheetPermissions: perSheetPermissions || {},
      isActive: "TRUE",
      createdAt: new Date().toISOString(),
      createdBy: session.user.username,
    };

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "127.0.0.1";

    await createUser(
      newUser,
      session.user.username,
      session.user.role,
      ip
    );

    return NextResponse.json({ success: true, user: { username: newUser.username } }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/users] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
