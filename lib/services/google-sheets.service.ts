import { google } from "googleapis";
import type { Student } from "../sheets";

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

export function getSheetsClient(): ReturnType<typeof google.sheets> | null {
  if (sheetsClient) return sheetsClient;

  const hasGoogleCreds =
    !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!process.env.GOOGLE_SHEET_ID;
  if (!hasGoogleCreds) return null;

  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
    if (creds && creds.private_key) {
      creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
  } catch (err) {
    console.error("[Sheets DB] Failed to load Google credentials:", err);
    return null;
  }
}

export async function listDriveFiles(folderId?: string) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  if (creds && creds.private_key) {
    creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const drive = google.drive({ version: "v3", auth });

  const query = folderId
    ? `'${folderId}' in parents and (mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`
    : `(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`;

  const response = await drive.files.list({
    q: query,
    fields: "files(id, name, mimeType, webViewLink, iconLink)",
    orderBy: "folder,name",
  });

  return response.data.files || [];
}

export async function fetchRawGoogleSheetsData(
  spreadsheetId: string,
  range: string = "Students!A:Z"
): Promise<{ data: Student[] }> {
  const client = getSheetsClient();
  if (!client)
    throw new Error(
      "Google Sheets client not initialized. Check your credentials."
    );

  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return { data: [] };

  const headers = rows[0] as string[];
  const data = rows.slice(1).map((row: string[], index: number) => {
    const obj: Record<string, string | number | undefined> = {};
    headers.forEach((header: string, colIndex: number) => {
      obj[header] = row[colIndex] || "";
    });
    obj["__rowIndex"] = index + 2;
    return obj as Student;
  });

  return { data };
}
