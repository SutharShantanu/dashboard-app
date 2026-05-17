import { test, expect } from "vitest";
import { google } from "googleapis";
import dotenv from "dotenv";
import connectToDatabase from "../lib/mongodb";
import ConnectedSheet from "../models/ConnectedSheet";

dotenv.config({ path: ".env" });

test("List sheets in spreadsheet", async () => {
  const spreadsheetId = "1p6Esyik1TOnZpQtsz8ZSB4GTF4u1M_Xf3gRjVBD4ESk";
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly"
    ],
  });
  
  const sheets = google.sheets({ version: "v4", auth });
  
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const sheetNames = response.data.sheets?.map(s => s.properties?.title);
    console.log("Sheet Names:", sheetNames);
    expect(true).toBe(true);
  } catch (error: any) {
    console.error("Error fetching sheets:", error);
    throw error;
  }
});

test("Check database for connected sheet", async () => {
  await connectToDatabase();
  const spreadsheetId = "1p6Esyik1TOnZpQtsz8ZSB4GTF4u1M_Xf3gRjVBD4ESk";
  const sheet = await ConnectedSheet.findOne({ spreadsheetId });
  console.log("Connected Sheet in DB:", sheet);
  expect(true).toBe(true);
}, 30000);
