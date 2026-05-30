import { describe, test, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../../app/api/users/route";
import { PATCH, DELETE } from "../../app/api/users/[username]/route";
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
  deleteUser: vi.fn(),
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
        isActive: true,
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

    test("allows standard admins to list users", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", displayName: "Standard Admin", role: "admin" },
      });

      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        {
          username: "target_sub",
          displayName: "Target Sub",
          email: "target@sub.com",
          passwordHash: "hash",
          role: "sub-admin",
          allowedColumns: "Comments,Notes",
          isActive: true,
          createdAt: "2026-05-11",
          createdBy: "admin",
        },
      ]);

      const req = new Request("http://localhost:3000/api/users");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.users).toHaveLength(1);
      expect(body.users[0].username).toBe("target_sub");
    });

    test("allows SabaAdmin to list users", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "SabaAdmin", displayName: "Saba Administrator", role: "admin" },
      });

      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        {
          username: "SabaAdmin",
          displayName: "Saba Administrator",
          email: "admin@domain.com",
          passwordHash: "hash",
          role: "admin",
          allowedColumns: "all",
          isActive: true,
          createdAt: "2026-05-11",
          createdBy: "system",
        },
      ]);

      const req = new Request("http://localhost:3000/api/users");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.users).toHaveLength(1);
      expect(body.users[0].username).toBe("SabaAdmin");
    });
  });

  describe("POST /api/users", () => {
    test("rejects standard sub-admins with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "sub", role: "sub-admin" },
      });

      const req = new Request("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({
          username: "new_sub",
          displayName: "New Sub",
          password: "plain_password",
          role: "sub-admin"
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    test("allows standard admins to create sub-admin users", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed_pwd_abc" as any);
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", displayName: "Standard Admin", role: "admin" },
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
          isActive: true,
          createdBy: "standard_admin",
        }),
        "standard_admin",
        "admin",
        expect.any(String)
      );
    });

    test("rejects standard admins attempting to create admin users with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", displayName: "Standard Admin", role: "admin" },
      });

      const req = new Request("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({
          username: "new_admin",
          displayName: "New Admin",
          password: "plain_password",
          role: "admin",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Standard admins can only create 'sub-admin' users");
    });

    test("allows SabaAdmin to create a new user with bcrypt hash", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed_pwd_abc" as any);
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "SabaAdmin", displayName: "Saba Administrator", role: "admin" },
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
          isActive: true,
          createdBy: "SabaAdmin",
        }),
        "SabaAdmin",
        "admin",
        expect.any(String)
      );
    });
  });

  describe("PATCH /api/users/[username]", () => {
    test("rejects sub-admins editing other users with 403", async () => {
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

    test("allows standard admins to update sub-admin settings", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", displayName: "Standard Admin", role: "admin" },
      });
      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        {
          username: "target_sub",
          role: "sub-admin",
          displayName: "Target Sub",
          email: "target@sub.com",
          passwordHash: "hash",
          allowedColumns: "Comments,Notes",
          isActive: true,
          createdAt: "2026-05-11",
          createdBy: "admin"
        }
      ]);

      const req = new Request("http://localhost:3000/api/users/target_sub", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "Updated Sub Name",
          allowedColumns: "Comments,Notes",
          isActive: false,
        }),
      });
      const res = await PATCH(req, { params: { username: "target_sub" } });

      expect(res.status).toBe(200);
      expect(sheets.updateUser).toHaveBeenCalledWith(
        "target_sub",
        {
          displayName: "Updated Sub Name",
          allowedColumns: "Comments,Notes",
          isActive: false,
        },
        "standard_admin",
        "admin",
        expect.any(String)
      );
    });

    test("rejects standard admins editing other admin users with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", displayName: "Standard Admin", role: "admin" },
      });
      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        {
          username: "other_admin",
          role: "admin",
          displayName: "Other Admin",
          email: "other@admin.com",
          passwordHash: "hash",
          allowedColumns: "all",
          isActive: true,
          createdAt: "2026-05-11",
          createdBy: "system"
        }
      ]);

      const req = new Request("http://localhost:3000/api/users/other_admin", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "Updated Admin Name",
        }),
      });
      const res = await PATCH(req, { params: { username: "other_admin" } });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Standard admins can only modify sub-admin users");
    });

    test("rejects standard admins editing SabaAdmin with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", displayName: "Standard Admin", role: "admin" },
      });
      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        {
          username: "SabaAdmin",
          role: "admin",
          displayName: "Saba Administrator",
          email: "admin@domain.com",
          passwordHash: "hash",
          allowedColumns: "all",
          isActive: true,
          createdAt: "2026-05-11",
          createdBy: "system"
        }
      ]);

      const req = new Request("http://localhost:3000/api/users/SabaAdmin", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "Updated Saba Name",
        }),
      });
      const res = await PATCH(req, { params: { username: "SabaAdmin" } });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Standard admins can only modify sub-admin users");
    });

    test("rejects standard admins changing sub-admin user role with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", displayName: "Standard Admin", role: "admin" },
      });
      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        {
          username: "target_sub",
          role: "sub-admin",
          displayName: "Target Sub",
          email: "target@sub.com",
          passwordHash: "hash",
          allowedColumns: "Comments,Notes",
          isActive: true,
          createdAt: "2026-05-11",
          createdBy: "admin"
        }
      ]);

      const req = new Request("http://localhost:3000/api/users/target_sub", {
        method: "PATCH",
        body: JSON.stringify({
          role: "admin",
        }),
      });
      const res = await PATCH(req, { params: { username: "target_sub" } });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Standard admins cannot change user roles");
    });

    test("allows standard admins to self-update their own displayName", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", displayName: "Standard Admin", role: "admin" },
      });

      const req = new Request("http://localhost:3000/api/users/standard_admin", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "New Admin Display Name",
        }),
      });
      const res = await PATCH(req, { params: { username: "standard_admin" } });

      expect(res.status).toBe(200);
      expect(sheets.updateUser).toHaveBeenCalledWith(
        "standard_admin",
        { displayName: "New Admin Display Name" },
        "standard_admin",
        "admin",
        expect.any(String)
      );
    });

    test("allows SabaAdmin to update another user's settings", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "SabaAdmin", displayName: "Saba Administrator", role: "admin" },
      });

      const req = new Request("http://localhost:3000/api/users/target_sub", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "Updated Sub Name",
          allowedColumns: "Comments,Notes",
          isActive: false,
        }),
      });
      const res = await PATCH(req, { params: { username: "target_sub" } });

      expect(res.status).toBe(200);
      expect(sheets.updateUser).toHaveBeenCalledWith(
        "target_sub",
        {
          displayName: "Updated Sub Name",
          allowedColumns: "Comments,Notes",
          isActive: false,
        },
        "SabaAdmin",
        "admin",
        expect.any(String)
      );
    });

    test("allows standard users to update their own displayName", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "sub", displayName: "Sub", role: "sub-admin" },
      });

      const req = new Request("http://localhost:3000/api/users/sub", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "New Display Name",
        }),
      });
      const res = await PATCH(req, { params: { username: "sub" } });

      expect(res.status).toBe(200);
      expect(sheets.updateUser).toHaveBeenCalledWith(
        "sub",
        { displayName: "New Display Name" },
        "sub",
        "sub-admin",
        expect.any(String)
      );
    });

    test("ignores extra fields and allows standard users to self-update displayName", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "sub", displayName: "Sub", role: "sub-admin" },
      });

      const req = new Request("http://localhost:3000/api/users/sub", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "New Display Name",
          role: "admin", // ignored on self-update
        }),
      });
      const res = await PATCH(req, { params: { username: "sub" } });

      expect(res.status).toBe(200);
      expect(sheets.updateUser).toHaveBeenCalledWith(
        "sub",
        { displayName: "New Display Name" },
        "sub",
        "sub-admin",
        expect.any(String)
      );
    });

    test("rejects role downgrade for SabaAdmin", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "SabaAdmin", displayName: "Saba Administrator", role: "admin" },
      });

      const req = new Request("http://localhost:3000/api/users/SabaAdmin", {
        method: "PATCH",
        body: JSON.stringify({
          role: "sub-admin",
        }),
      });
      const res = await PATCH(req, { params: { username: "SabaAdmin" } });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("SabaAdmin's role must always remain 'admin'");
    });

    test("rejects deactivation/suspension for SabaAdmin", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "SabaAdmin", displayName: "Saba Administrator", role: "admin" },
      });

      const req = new Request("http://localhost:3000/api/users/SabaAdmin", {
        method: "PATCH",
        body: JSON.stringify({
          isActive: false,
        }),
      });
      const res = await PATCH(req, { params: { username: "SabaAdmin" } });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("SabaAdmin must always remain active");
    });

    test("allows SabaAdmin to self-update displayName, email, and password", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "SabaAdmin", displayName: "Saba Administrator", role: "admin" },
      });
      vi.mocked(bcrypt.hash).mockResolvedValueOnce("hashed_new_pwd" as any);

      const req = new Request("http://localhost:3000/api/users/SabaAdmin", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "New Saba Name",
          email: "new_saba@domain.com",
          password: "new_password",
          role: "admin", // ignored/not treated as change
          isActive: true, // ignored/not treated as change
        }),
      });
      const res = await PATCH(req, { params: { username: "SabaAdmin" } });

      expect(res.status).toBe(200);
      expect(sheets.updateUser).toHaveBeenCalledWith(
        "sabaadmin",
        {
          displayName: "New Saba Name",
          email: "new_saba@domain.com",
          passwordHash: "hashed_new_pwd",
        },
        "SabaAdmin",
        "admin",
        expect.any(String)
      );
    });
  });

  describe("DELETE /api/users/[username]", () => {
    test("rejects unauthenticated requests with 401", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/users/target_sub", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { username: "target_sub" } });

      expect(res.status).toBe(401);
    });

    test("rejects non-admin (sub-admin) users with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "sub", role: "sub-admin" },
      });

      const req = new Request("http://localhost:3000/api/users/target_sub", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { username: "target_sub" } });

      expect(res.status).toBe(403);
    });

    test("rejects self-deletion with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", role: "admin" },
      });

      const req = new Request("http://localhost:3000/api/users/standard_admin", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { username: "standard_admin" } });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("cannot delete your own active account");
    });

    test("rejects deleting SabaAdmin with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "SabaAdmin", role: "admin" },
      });

      const req = new Request("http://localhost:3000/api/users/SabaAdmin", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { username: "SabaAdmin" } });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("SabaAdmin account cannot be deleted");
    });

    test("rejects deleting SabaAdmin by standard admin with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", role: "admin" },
      });

      const req = new Request("http://localhost:3000/api/users/SabaAdmin", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { username: "SabaAdmin" } });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("SabaAdmin account cannot be deleted");
    });

    test("returns 404 if the target user does not exist", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "SabaAdmin", role: "admin" },
      });
      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        { username: "SabaAdmin", role: "admin" } as any,
      ]);

      const req = new Request("http://localhost:3000/api/users/non_existent", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { username: "non_existent" } });

      expect(res.status).toBe(404);
    });

    test("allows SabaAdmin to delete any other user", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "SabaAdmin", role: "admin" },
      });
      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        { username: "target_sub", role: "sub-admin" } as any,
      ]);

      const req = new Request("http://localhost:3000/api/users/target_sub", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { username: "target_sub" } });

      expect(res.status).toBe(200);
      expect(sheets.deleteUser).toHaveBeenCalledWith(
        "target_sub",
        "SabaAdmin",
        "admin",
        expect.any(String)
      );
    });

    test("allows standard admins to delete sub-admin users", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", role: "admin" },
      });
      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        { username: "target_sub", role: "sub-admin" } as any,
      ]);

      const req = new Request("http://localhost:3000/api/users/target_sub", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { username: "target_sub" } });

      expect(res.status).toBe(200);
      expect(sheets.deleteUser).toHaveBeenCalledWith(
        "target_sub",
        "standard_admin",
        "admin",
        expect.any(String)
      );
    });

    test("rejects standard admins deleting other standard admin accounts with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { username: "standard_admin", role: "admin" },
      });
      vi.mocked(sheets.getUsers).mockResolvedValueOnce([
        { username: "other_admin", role: "admin" } as any,
      ]);

      const req = new Request("http://localhost:3000/api/users/other_admin", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { username: "other_admin" } });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Standard admins can only delete sub-admin users");
    });
  });
});
