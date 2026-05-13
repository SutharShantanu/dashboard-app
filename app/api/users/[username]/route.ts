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

    if (body.allowedColumns !== undefined) {
      const allowedColumns = String(body.allowedColumns).trim();

      // Determine the final role of the updated user to see if they are a sub-admin
      const users = await getUsers();
      const existingUser = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
      const targetRole = body.role !== undefined ? body.role : (existingUser ? existingUser.role : "sub-admin");

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

      updates.allowedColumns = allowedColumns;
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
      session.user.displayName,
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
