import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getStudents, getDbMode, updateStudentCell, createStudent, syncSheetData, resolveUserAllowedColumns } from "../../../lib/sheets";
import { rateLimit } from "../../../lib/rate-limit";
import { logger } from "../../../lib/logger";

// GET: Retrieves all student records and the active database configuration (simulation mode status)
export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rl = await rateLimit(ip, 100, 60); // 100 requests per minute per IP
    
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const sheet = url.searchParams.get("sheet") || undefined;
    const spreadsheetId = url.searchParams.get("spreadsheetId") || undefined;

    const { data, columns } = await getStudents(sheet, spreadsheetId);

    const activeSheetName = sheet || "Students";
    const allowedCols = resolveUserAllowedColumns(session.user, activeSheetName, columns, spreadsheetId);

    let permittedCols = columns;
    let filteredData = data;
    if (session.user.role !== "admin") {
      const systemCols = ["ID", "LastModifiedBy", "LastModifiedAt", "__rowIndex", "_id"];
      permittedCols = columns.filter(col => allowedCols.includes(col) || systemCols.includes(col));
      filteredData = data.map((row: any) => {
        const filteredRow: any = {};
        permittedCols.forEach(col => {
          filteredRow[col] = row[col];
        });
        filteredRow._id = row._id; // Keep MongoDB ID
        return filteredRow;
      });
    }

    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");
    
    let page = pageParam ? parseInt(pageParam, 10) : 1;
    let limit = limitParam ? parseInt(limitParam, 10) : undefined;
    
    if (page < 1) page = 1;

    let paginatedData = filteredData;
    let totalPages = 1;
    
    if (limit && limit > 0) {
      totalPages = Math.ceil(filteredData.length / limit);
      const startIndex = (page - 1) * limit;
      paginatedData = filteredData.slice(startIndex, startIndex + limit);
    }

    return NextResponse.json({
      data: paginatedData,
      columns,
      allowedColumns: allowedCols,
      simulated: getDbMode().isSimulated,
      configured: getDbMode().isConfigured,
      pagination: {
        page,
        limit: limit || filteredData.length,
        total: filteredData.length,
        totalPages
      }
    });
  } catch (error: any) {
    logger.error({ err: error }, "[GET /api/students] Error");
    return NextResponse.json(
      { error: error.message || "Failed to fetch student data" },
      { status: 500 }
    );
  }
}

import { z } from "zod";

const studentPostSchema = z.object({
  ID: z.string().min(1, "ID is required"),
  Name: z.string().min(1, "Name is required"),
  Email: z.string().email("Invalid email"),
  Phone: z.string().optional(),
  Course: z.string().optional(),
  Batch: z.string().optional(),
  Status: z.string().optional(),
  Score: z.string().optional(),
  Remarks: z.string().optional(),
  Grade: z.string().optional(),
  Comments: z.string().optional(),
  Notes: z.string().optional(),
  sheet: z.string().optional(),
  spreadsheetId: z.string().optional()
});

const studentPatchSchema = z.object({
  id: z.string().min(1, "Student ID is required"),
  column: z.string().min(1, "Target column is required"),
  value: z.any(),
  sheet: z.string().optional(),
  spreadsheetId: z.string().optional()
});

// POST: Add a new student record (Admin Only)
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rl = await rateLimit(`post_${ip}`, 30, 60); // 30 creates per minute
    
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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
    
    const parsed = studentPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }
    
    const { ID, Name, Email, Phone, Course, Batch, Status, Score, Remarks, Grade, Comments, Notes, sheet, spreadsheetId } = parsed.data;


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
      session.user.role,
      ip,
      sheet,
      spreadsheetId
    );

    return NextResponse.json({ success: true, student: newStudent });
  } catch (error: any) {
    logger.error({ err: error }, "[POST /api/students] Error");
    return NextResponse.json(
      { error: error.message || "Failed to create student record." },
      { status: 500 }
    );
  }
}

// PATCH: Updates a single cell inline (Admins can edit any; Sub-admins can edit only allowed columns on the right of M)
export async function PATCH(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rl = await rateLimit(`patch_${ip}`, 60, 60); // 60 updates per minute
    
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const parsed = studentPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }
    
    const { id, column, value, sheet, spreadsheetId } = parsed.data;

    // System columns can never be modified directly
    if (column === "ID" || column === "LastModifiedBy" || column === "LastModifiedAt" || column === "_id") {
      return NextResponse.json(
        { error: "System columns cannot be directly modified." },
        { status: 400 }
      );
    }

    // Role-based permission check using the unified helper
    const activeSheetName = sheet || "Students";
    const { columns } = await getStudents(sheet, spreadsheetId);
    const allowedCols = resolveUserAllowedColumns(session.user, activeSheetName, columns, spreadsheetId);

    if (!allowedCols.includes(column)) {
      const gradeIndex = columns.indexOf("Grade");
      const colIndex = columns.indexOf(column);
      if (session.user.role !== "admin" && gradeIndex !== -1 && colIndex !== -1 && colIndex <= gradeIndex) {
        return NextResponse.json(
          { error: "🔒 Lock: Columns up to 'Grade' can only be edited by Admins." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `🔒 Lock: You do not have permission to edit the '${column}' column.` },
        { status: 403 }
      );
    }


    await updateStudentCell(
      id,
      column,
      String(value || ""),
      session.user.username,
      session.user.role,
      ip,
      sheet,
      spreadsheetId
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "[PATCH /api/students] Error");
    return NextResponse.json(
      { error: error.message || "Failed to update cell." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const spreadsheetId = url.searchParams.get("spreadsheetId");

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required." }, { status: 400 });
    }

    await syncSheetData(spreadsheetId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PUT /api/students] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync sheet data" },
      { status: 500 }
    );
  }
}
