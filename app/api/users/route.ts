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

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins only" },
        { status: 403 }
      );
    }

    const users = await getUsers();
    return NextResponse.json(users);
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

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, displayName, password, role, allowedColumns } = body;

    if (!username || !displayName || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields (username, displayName, password, role)" },
        { status: 400 }
      );
    }

    const targetRole = role === "admin" ? "admin" : "sub-admin";

    if (targetRole === "sub-admin" && allowedColumns) {
      const { columns } = await getStudents();
      const gradeIndex = columns.indexOf("Grade");
      if (gradeIndex !== -1) {
        const selectedCols = allowedColumns.split(",").map((c: string) => c.trim());
        const invalidCols = selectedCols.filter((colName: string) => {
          const colIdx = columns.indexOf(colName);
          return colIdx !== -1 && colIdx <= gradeIndex;
        });

        if (invalidCols.length > 0) {
          return NextResponse.json(
            {
              error: `Forbidden: Sub-admins are only allowed to edit columns to the right of the 'Grade' column (column M). Invalid columns selected: ${invalidCols.join(
                ", "
              )}`,
            },
            { status: 400 }
          );
        }
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser: User = {
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      passwordHash,
      role: role === "admin" ? "admin" : "sub-admin",
      allowedColumns: allowedColumns || "",
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
      session.user.displayName,
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
