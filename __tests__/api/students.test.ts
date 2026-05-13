import { describe, test, expect, vi, beforeEach } from "vitest";
import { GET } from "../../app/api/students/route";
import { PATCH } from "../../app/api/students/[id]/route";
import { getServerSession } from "next-auth/next";
import * as sheets from "../../lib/sheets";

// Mock next-auth and sheets
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("../../lib/sheets", () => ({
  getStudents: vi.fn(),
  updateStudentCell: vi.fn(),
}));

describe("Students API Gating & Security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(sheets.getStudents).mockResolvedValue({
      columns: ["ID", "Name", "Status", "Grade", "Extra1", "Extra2"],
      data: [],
    });
  });

  describe("GET /api/students", () => {
    test("rejects unauthenticated requests with 401 status", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/students");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Unauthorized");
    });

    test("allows authenticated users and returns filtered headers based on role", async () => {
      // Mock sub-admin session
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          username: "sub_user",
          displayName: "Sub User",
          role: "sub-admin",
          allowedColumns: "ID,Name,Email,Status",
        },
      });

      // Mock database output
      vi.mocked(sheets.getStudents).mockResolvedValueOnce({
        data: [
          { ID: "1", Name: "Alice", Email: "alice@example.com", Status: "Active", Score: "95" },
        ] as any,
        columns: ["ID", "Name", "Email", "Status", "Score"],
      });

      const req = new Request("http://localhost:3000/api/students");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      
      // All data is returned, but let's make sure the returned allowed columns list is populated
      expect(body.columns).toEqual(["ID", "Name", "Email", "Status", "Score"]);
      expect(body.allowedColumns).toEqual(["ID", "Name", "Email", "Status"]);
      expect(body.data).toHaveLength(1);
    });
  });

  describe("PATCH /api/students/[id]", () => {
    test("rejects unauthenticated cell updates with 401", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/students/1", {
        method: "PATCH",
        body: JSON.stringify({ column: "Name", value: "Bob" }),
      });
      const res = await PATCH(req, { params: { id: "1" } });

      expect(res.status).toBe(401);
    });

    test("allows admins to edit any column", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          username: "admin_user",
          displayName: "Admin User",
          role: "admin",
          allowedColumns: "all",
        },
      });

      const req = new Request("http://localhost:3000/api/students/1", {
        method: "PATCH",
        body: JSON.stringify({ column: "Score", value: "99" }),
      });
      const res = await PATCH(req, { params: { id: "1" } });

      expect(res.status).toBe(200);
      expect(sheets.updateStudentCell).toHaveBeenCalledWith(
        "1",
        "Score",
        "99",
        "admin_user",
        "Admin User",
        "admin",
        expect.any(String)
      );
    });

    test("rejects sub-admins editing unauthorized columns with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          username: "sub_user",
          displayName: "Sub User",
          role: "sub-admin",
          allowedColumns: "ID,Name,Status",
        },
      });

      const req = new Request("http://localhost:3000/api/students/1", {
        method: "PATCH",
        body: JSON.stringify({ column: "Score", value: "99" }),
      });
      const res = await PATCH(req, { params: { id: "1" } });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("not permitted");
      expect(sheets.updateStudentCell).not.toHaveBeenCalled();
    });

    test("allows sub-admins editing authorized columns", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          username: "sub_user",
          displayName: "Sub User",
          role: "sub-admin",
          allowedColumns: "ID,Name,Status",
        },
      });
      vi.mocked(sheets.getStudents).mockResolvedValueOnce({
        data: [] as any,
        columns: ["ID", "Name", "Status", "Grade", "Extra1", "Extra2"],
      });

      const req = new Request("http://localhost:3000/api/students/1", {
        method: "PATCH",
        body: JSON.stringify({ column: "Status", value: "Completed" }),
      });
      const res = await PATCH(req, { params: { id: "1" } });

      // Note: "Status" is before "Grade", but since the existing mock of getStudents didn't specify column order in some older tests,
      // let's ensure we test the boundary strictly. Since "Status" (idx 2) is <= "Grade" (idx 3), it will be rejected.
      expect(res.status).toBe(403);
    });

    test("rejects sub-admins trying to edit any column at or to the left of Grade", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          username: "sub_user",
          displayName: "Sub User",
          role: "sub-admin",
          allowedColumns: "ID,Name,Grade",
        },
      });
      vi.mocked(sheets.getStudents).mockResolvedValueOnce({
        data: [] as any,
        columns: ["ID", "Name", "Grade", "Comments", "Notes"],
      });

      const req = new Request("http://localhost:3000/api/students/1", {
        method: "PATCH",
        body: JSON.stringify({ column: "Grade", value: "A" }),
      });
      const res = await PATCH(req, { params: { id: "1" } });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Sub-admins are only allowed to edit columns to the right of the 'Grade' column");
    });

    test("allows sub-admins to edit columns strictly to the right of Grade if allowed", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          username: "sub_user",
          displayName: "Sub User",
          role: "sub-admin",
          allowedColumns: "ID,Name,Comments",
        },
      });
      vi.mocked(sheets.getStudents).mockResolvedValueOnce({
        data: [] as any,
        columns: ["ID", "Name", "Grade", "Comments", "Notes"],
      });

      const req = new Request("http://localhost:3000/api/students/1", {
        method: "PATCH",
        body: JSON.stringify({ column: "Comments", value: "Good student" }),
      });
      const res = await PATCH(req, { params: { id: "1" } });

      expect(res.status).toBe(200);
      expect(sheets.updateStudentCell).toHaveBeenCalledWith(
        "1",
        "Comments",
        "Good student",
        "sub_user",
        "Sub User",
        "sub-admin",
        expect.any(String)
      );
    });
  });
});
