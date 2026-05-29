import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../../app/api/sheet-webhook/route";
import * as sheets from "../../lib/sheets";

vi.mock("../../lib/sheets", () => ({
  getStudents: vi.fn(),
  updateStudentCell: vi.fn(),
}));

vi.mock("../../lib/mongodb", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../models/ConnectedSheet", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

import ConnectedSheet from "../../models/ConnectedSheet";

const VALID_SECRET = "test-webhook-secret-123";

function makeRequest(body: object, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/sheet-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/sheet-webhook", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, SHEET_WEBHOOK_SECRET: VALID_SECRET };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("returns 503 when SHEET_WEBHOOK_SECRET is not set", async () => {
    delete process.env.SHEET_WEBHOOK_SECRET;

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/not configured/i);
  });

  test("returns 401 when x-webhook-secret header is missing", async () => {
    const res = await POST(makeRequest({ sheetName: "Students", row: 2, col: 1 }));
    expect(res.status).toBe(401);
  });

  test("returns 401 when x-webhook-secret header is wrong", async () => {
    const res = await POST(
      makeRequest({ sheetName: "Students", row: 2, col: 1 }, {
        "x-webhook-secret": "wrong-secret",
      })
    );
    expect(res.status).toBe(401);
  });

  test("returns 401 when Authorization: Bearer header is used instead of x-webhook-secret", async () => {
    // Old format (apps-script.js pre-fix) must be rejected
    const res = await POST(
      makeRequest({ sheetName: "Students", row: 2, col: 1 }, {
        Authorization: `Bearer ${VALID_SECRET}`,
      })
    );
    expect(res.status).toBe(401);
  });

  test("returns 404 when ConnectedSheet cannot be resolved", async () => {
    vi.mocked(ConnectedSheet.findOne).mockResolvedValue(null);

    const res = await POST(
      makeRequest(
        { sheetName: "Students", spreadsheetId: "unknown-id", row: 2, col: 1 },
        { "x-webhook-secret": VALID_SECRET }
      )
    );
    expect(res.status).toBe(404);
  });

  test("calls updateStudentCell with correct argument order on valid payload", async () => {
    vi.mocked(ConnectedSheet.findOne).mockResolvedValue({
      spreadsheetId: "sheet-abc",
      sheetName: "Students",
    } as never);
    vi.mocked(sheets.getStudents).mockResolvedValue({
      data: [{ ID: "S1", Name: "Alice" }] as never,
      columns: ["ID", "Name"],
    });
    vi.mocked(sheets.updateStudentCell).mockResolvedValue(undefined);

    const res = await POST(
      makeRequest(
        {
          sheetName: "Students",
          spreadsheetId: "sheet-abc",
          row: 2,
          col: 2,
          newValue: "Bob",
        },
        { "x-webhook-secret": VALID_SECRET }
      )
    );

    expect(res.status).toBe(200);
    // Verify argument order: (id, column, newValue, actor, actorRole, ip, sheetName, spreadsheetId)
    expect(sheets.updateStudentCell).toHaveBeenCalledWith(
      "S1",           // id
      "Name",         // column
      "Bob",          // newValue
      "google-sheets-sync", // actor
      "webhook",      // actorRole
      expect.any(String),  // ip
      "Students",     // sheetName
      "sheet-abc"     // spreadsheetId
    );
  });

  test("returns 404 when row index is out of bounds", async () => {
    vi.mocked(ConnectedSheet.findOne).mockResolvedValue({
      spreadsheetId: "sheet-abc",
      sheetName: "Students",
    } as never);
    vi.mocked(sheets.getStudents).mockResolvedValue({
      data: [],
      columns: ["ID", "Name"],
    });

    const res = await POST(
      makeRequest(
        { sheetName: "Students", spreadsheetId: "sheet-abc", row: 99, col: 1 },
        { "x-webhook-secret": VALID_SECRET }
      )
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });
});
