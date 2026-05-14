import { describe, test, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../../app/api/users/route";
import { PATCH } from "../../app/api/users/[username]/route";
import { getServerSession } from "next-auth/next";
import * as sheets from "../../lib/sheets";
import bcrypt from "bcryptjs";

// Mock next-auth, sheets, and bcrypt
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("../../lib/sheets", () => ({
  getUsers: vi.fn().mockResolvedValue([{ username: "target_sub", role: "sub-admin" }]),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getStudents: vi.fn().mockResolvedValue({ columns: ["ID", "Name", "Grade", "Comments", "Notes"], data: [] }),
}));

vi.mock("bcryptjs", () => {
  const mockHash = vi.fn().mockResolvedValue("hashed_pwd_abc");
  const mockCompare = vi.fn();
  return {
    default: {
      hash: mockHash,
      compare: mockCompare,
    },
    hash: mockHash,
    compare: mockCompare,
  };
});

describe("Users API & Sub-Admin Directory Security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(sheets.getStudents).mockResolvedValue({
      columns: ["ID", "Name", "Grade", "Comments", "Notes"],
      data: [],
    });
    vi.mocked(sheets.getUsers).mockResolvedValue([
      {
        username: "target_sub",
        role: "sub-admin",
        displayName: "Target Sub",
        email: "target@sub.com",
        passwordHash: "hash",
        allowedColumns: "Comments,Notes",
        isActive: "TRUE",
        createdAt: "2026-05-11",
        createdBy: "admin"
      }
    ]);
  });

  describe("GET /api/users", () => {
    test("rejects unauthenticated requests with 401", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/users");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    test("rejects sub-admins with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "sub", displayName: "Sub", role: "sub-admin" },
      });

      const req = new Request("http://localhost:3000/api/users");
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    test("allows admins to list users", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "admin", displayName: "Admin", role: "admin" },
      });

      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        {
          username: "admin",
          displayName: "Admin",
          email: "admin@domain.com",
          passwordHash: "hash",
          role: "admin",
          allowedColumns: "all",
          isActive: "TRUE",
          createdAt: "2026-05-11",
          createdBy: "system",
        },
      ]);

      const req = new Request("http://localhost:3000/api/users");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].username).toBe("admin");
    });
  });

  describe("POST /api/users", () => {
    test("rejects non-admins", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "sub", role: "sub-admin" },
      });

      const req = new Request("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({ username: "new_sub" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    test("allows admins to create a new user with bcrypt hash", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed_pwd_abc" as any);
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "admin", displayName: "Admin", role: "admin" },
      });

      const req = new Request("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({
          username: "new_sub",
          displayName: "New Sub Admin",
          password: "plain_password",
          role: "sub-admin",
          allowedColumns: "Comments,Notes",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(bcrypt.hash).toHaveBeenCalledWith("plain_password", 12);
      expect(sheets.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "new_sub",
          displayName: "New Sub Admin",
          email: "",
          passwordHash: "hashed_pwd_abc",
          role: "sub-admin",
          allowedColumns: "Comments,Notes",
          isActive: "TRUE",
          createdBy: "admin",
        }),
        "admin",
        "Admin",
        "admin",
        expect.any(String)
      );
    });
  });

  describe("PATCH /api/users/[username]", () => {
    test("rejects non-admins", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "sub", role: "sub-admin" },
      });

      const req = new Request("http://localhost:3000/api/users/target_sub", {
        method: "PATCH",
        body: JSON.stringify({ isActive: "FALSE" }),
      });
      const res = await PATCH(req, { params: { username: "target_sub" } });

      expect(res.status).toBe(403);
    });

    test("allows admins to update user settings", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "admin", displayName: "Admin", role: "admin" },
      });

      const req = new Request("http://localhost:3000/api/users/target_sub", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "Updated Sub Name",
          allowedColumns: "Comments,Notes",
          isActive: "FALSE",
        }),
      });
      const res = await PATCH(req, { params: { username: "target_sub" } });

      expect(res.status).toBe(200);
      expect(sheets.updateUser).toHaveBeenCalledWith(
        "target_sub",
        {
          displayName: "Updated Sub Name",
          allowedColumns: "Comments,Notes",
          isActive: "FALSE",
        },
        "admin",
        "Admin",
        "admin",
        expect.any(String)
      );
    });
  });
});
