import { describe, test, expect, vi } from "vitest";
import { fetchRawGoogleSheetsData } from "../../lib/sheets";

// Mock googleapis
vi.mock("googleapis", () => ({
  google: {
    sheets: vi.fn().mockReturnValue({
      spreadsheets: {
        values: {
          get: vi.fn().mockResolvedValue({
            data: {
              values: [
                ["Access Status", "Name"],
                ["Done", "Sadaf"],
                ["Done", "Smiley"]
              ]
            }
          })
        }
      }
    }),
    auth: {
      GoogleAuth: vi.fn().mockImplementation(function() {
        return {
          authorize: vi.fn().mockResolvedValue({})
        };
      }),
      JWT: vi.fn().mockReturnValue({})
    }
  }
}));

describe("fetchRawGoogleSheetsData", () => {
  test("adds __rowIndex to each row object", async () => {
    // Mock env vars to avoid error
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: "test@example.com", private_key: "test_key" });
    process.env.GOOGLE_SHEET_ID = "test-id";

    const result = await fetchRawGoogleSheetsData("test-id", "Sheet1!A:Z");
    
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toHaveProperty("__rowIndex", 2);
    expect(result.data[1]).toHaveProperty("__rowIndex", 3);
    expect(result.data[0]["Access Status"]).toBe("Done");
    expect(result.data[1]["Access Status"]).toBe("Done");
  });
});
