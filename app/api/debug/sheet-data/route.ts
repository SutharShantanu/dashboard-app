import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import mongoose from "mongoose";
import { syncSheetData } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const url = new URL(req.url);
  const spreadsheetId = url.searchParams.get("spreadsheetId");
  const SheetRow = mongoose.models.SheetRow || mongoose.model("SheetRow", new mongoose.Schema({
    sheetId: String,
    rowId: String,
    data: Object,
    lastModifiedBy: String,
    lastModifiedAt: Date
  }));

  const ConnectedSheet = mongoose.models.ConnectedSheet || mongoose.model("ConnectedSheet", new mongoose.Schema({
    spreadsheetId: String,
    title: String,
    sheetName: String,
    url: String,
    addedBy: String,
    createdAt: Date
  }));

  if (spreadsheetId) {
    try {
      await syncSheetData(spreadsheetId);
    } catch (e: any) {
      console.log("Sync failed in debug:", e.message);
    }
  }

  const rows = spreadsheetId 
    ? await SheetRow.find({ sheetId: spreadsheetId })
    : await SheetRow.find({});

  const distinctSheetIds = await SheetRow.distinct("sheetId");
  const connectedSheets = await ConnectedSheet.find({});

  return NextResponse.json({ 
    count: rows.length, 
    distinctSheetIds, 
    connectedSheetsCount: connectedSheets.length,
    connectedSheets,
    rows 
  });
}
