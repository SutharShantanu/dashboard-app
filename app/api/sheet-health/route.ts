import { NextResponse } from "next/server";

let cachedLastModified = new Date().toISOString();
let cachedRowCount = 120;

export async function GET() {
  return NextResponse.json({
    lastModified: cachedLastModified,
    rowCount: cachedRowCount,
    status: "healthy",
  });
}
