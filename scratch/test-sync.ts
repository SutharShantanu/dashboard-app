import { syncSheetData } from "../lib/sheets";
import connectToDatabase from "../lib/mongodb";

async function main() {
  await connectToDatabase();
  console.log("Connected to DB");
  try {
    await syncSheetData("1p6Esyik1TOnZpQtsz8ZSB4GTF4u1M_Xf3gRjVBD4ESk");
    console.log("Sync success!");
  } catch (e: any) {
    console.error("Sync failed:", e);
  }
  process.exit(0);
}

main();
