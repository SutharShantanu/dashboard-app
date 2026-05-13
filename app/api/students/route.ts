import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getStudents, getDbMode, updateStudentCell, createStudent } from "../../../lib/sheets";

// GET: Retrieves all student records and the active database configuration (simulation mode status)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, columns } = await getStudents();

    // Map allowed columns for UI edit locks
    let allowedCols: string[] = [];
    if (session.user.role === "admin") {
      allowedCols = [...columns];
    } else {
      allowedCols = session.user.allowedColumns
        ? session.user.allowedColumns.split(",").map((c) => c.trim())
        : [];
    }

    return NextResponse.json({
      data,
      columns,
      allowedColumns: allowedCols,
      simulated: getDbMode().isSimulated,
      configured: getDbMode().isConfigured,
    });
  } catch (error: any) {
    console.error("[GET /api/students] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch student data" },
      { status: 500 }
    );
  }
}

// POST: Add a new student record (Admin Only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can create students." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ID, Name, Email, Phone, Course, Batch, Status, Score, Remarks, Grade, Comments, Notes } = body;

    if (!ID || !Name || !Email) {
      return NextResponse.json(
        { error: "ID, Name, and Email are required fields." },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

    const newStudent = {
      ID: ID.trim(),
      Name: Name.trim(),
      Email: Email.trim(),
      Phone: (Phone || "").trim(),
      Course: (Course || "").trim(),
      Batch: (Batch || "").trim(),
      Status: (Status || "Active").trim(),
      Score: (Score || "").trim(),
      Remarks: (Remarks || "").trim(),
      Grade: (Grade || "").trim(),
      Comments: (Comments || "").trim(),
      Notes: (Notes || "").trim(),
      LastModifiedBy: session.user.username,
      LastModifiedAt: new Date().toISOString(),
    };

    await createStudent(
      newStudent,
      session.user.username,
      session.user.displayName,
      session.user.role,
      ip
    );

    return NextResponse.json({ success: true, student: newStudent });
  } catch (error: any) {
    console.error("[POST /api/students] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create student record." },
      { status: 500 }
    );
  }
}

// PATCH: Updates a single cell inline (Admins can edit any; Sub-admins can edit only allowed columns on the right of M)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, column, value } = body;

    if (!id || !column) {
      return NextResponse.json(
        { error: "Student ID and target Column are required." },
        { status: 400 }
      );
    }

    // System columns can never be modified directly
    if (column === "ID" || column === "LastModifiedBy" || column === "LastModifiedAt") {
      return NextResponse.json(
        { error: "System columns cannot be directly modified." },
        { status: 400 }
      );
    }

    // Role-based permission check
    if (session.user.role !== "admin") {
      // Sub-admin column permissions
      // 1. Column J (index 9) is 'Grade'. Any column <= Grade (ID, Name, Email, Phone, Course, Batch, Status, Score, Remarks, Grade) is locked
      const forbiddenCols = [
        "Name",
        "Email",
        "Phone",
        "Course",
        "Batch",
        "Status",
        "Score",
        "Remarks",
        "Grade",
      ];

      if (forbiddenCols.includes(column)) {
        return NextResponse.json(
          { error: `🔒 Lock: Columns up to 'Grade' can only be edited by Admins.` },
          { status: 403 }
        );
      }

      // 2. Must be listed in their explicit allowedColumns list
      const allowedList = session.user.allowedColumns
        ? session.user.allowedColumns.split(",").map((c) => c.trim())
        : [];

      if (!allowedList.includes(column)) {
        return NextResponse.json(
          { error: `🔒 Lock: You do not have permission to edit the '${column}' column.` },
          { status: 403 }
        );
      }
    }

    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

    await updateStudentCell(
      id,
      column,
      String(value || ""),
      session.user.username,
      session.user.displayName,
      session.user.role,
      ip
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PATCH /api/students] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update cell." },
      { status: 500 }
    );
  }
}
