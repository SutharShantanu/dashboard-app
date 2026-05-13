import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { updateStudentCell, getStudents } from "../../../../lib/sheets";

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
    const { id } = resolvedParams;
    const body = await request.json();
    const { column, value } = body;

    if (!column) {
      return NextResponse.json(
        { error: "Column is required for editing cell values" },
        { status: 400 }
      );
    }

    // Verify column edit authorization
    const role = session.user.role;
    if (role !== "admin") {
      const { columns } = await getStudents();
      const gradeIndex = columns.indexOf("Grade");
      const targetIndex = columns.indexOf(column);

      // Sub-admins cannot edit Grade (M) or any column to its left
      if (gradeIndex !== -1 && targetIndex !== -1 && targetIndex <= gradeIndex) {
        return NextResponse.json(
          {
            error: `Forbidden: Sub-admins are only allowed to edit columns to the right of the 'Grade' column (column M).`,
          },
          { status: 403 }
        );
      }

      const allowedCols = session.user.allowedColumns
        ? session.user.allowedColumns.split(",").map((c) => c.trim())
        : [];

      if (!allowedCols.includes(column)) {
        return NextResponse.json(
          { error: `You are not permitted to edit the '${column}' column.` },
          { status: 403 }
        );
      }
    }

    // Safely retrieve caller IP address
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "127.0.0.1";

    await updateStudentCell(
      id,
      column,
      value === undefined || value === null ? "" : String(value),
      session.user.username,
      session.user.displayName,
      session.user.role,
      ip
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PATCH /api/students/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to edit student record" },
      { status: 500 }
    );
  }
}
