/**
 * scripts/grant-sabaadmin-all-sheets.js
 *
 * One-shot migration: grants SabaAdmin ["*"] (all columns) access
 * for every ConnectedSheet already in the database via perSheetPermissions.
 *
 * Run with:
 *   node scripts/grant-sabaadmin-all-sheets.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env (project root)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also try .env.local as fallback
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ── Schemas ────────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  username:           { type: String, required: true, unique: true },
  displayName:        { type: String, required: true },
  email:              { type: String, required: true, unique: true },
  passwordHash:       { type: String, required: true },
  role:               { type: String, enum: ['admin', 'sub-admin'], required: true },
  allowedColumns:     { type: String, default: '' },
  permissionPreset:   { type: String },
  perSheetPermissions:{ type: Map, of: [String], default: {} },
  isActive:           { type: Boolean, default: true },
  createdAt:          { type: Date, default: Date.now },
  createdBy:          { type: String, required: true },
});

const ConnectedSheetSchema = new mongoose.Schema({
  spreadsheetId: { type: String, required: true, unique: true },
  title:         { type: String, required: true },
  sheetName:     { type: String, required: true },
  url:           { type: String, required: true },
  addedBy:       { type: String, required: true },
  createdAt:     { type: Date, default: Date.now },
});

const User          = mongoose.models.User          || mongoose.model('User',          UserSchema);
const ConnectedSheet = mongoose.models.ConnectedSheet || mongoose.model('ConnectedSheet', ConnectedSheetSchema);

// ── Main ───────────────────────────────────────────────────────────────────────

async function grantSabaAdminAllSheets() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI is not defined in .env or .env.local');
    process.exit(1);
  }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(uri);
  console.log('✅  Connected.\n');

  // 1. Find SabaAdmin
  const sabaAdmin = await User.findOne({
    username: { $regex: /^SabaAdmin$/i }
  });

  if (!sabaAdmin) {
    console.error('❌  SabaAdmin user not found in the database. Aborting.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`👤  Found user: ${sabaAdmin.username} (${sabaAdmin.role})`);

  // 2. Fetch all connected sheets
  const connectedSheets = await ConnectedSheet.find({});

  if (connectedSheets.length === 0) {
    console.log('ℹ️   No connected sheets found in the database. Nothing to do.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`📋  Found ${connectedSheets.length} connected sheet(s):\n`);
  connectedSheets.forEach(s => console.log(`    • [${s.sheetName}]  "${s.title}"  (${s.spreadsheetId})`));
  console.log('');

  // 3. Build the updated perSheetPermissions map
  //    Preserve any existing entries and add/overwrite with ["*"] for each sheet
  const currentPerms = sabaAdmin.perSheetPermissions
    ? Object.fromEntries(sabaAdmin.perSheetPermissions.entries())
    : {};

  let changed = 0;
  for (const sheet of connectedSheets) {
    const key = sheet.sheetName;
    const hadAccess = JSON.stringify(currentPerms[key]) === JSON.stringify(['*']);
    currentPerms[key] = ['*'];
    if (!hadAccess) {
      console.log(`  ✏️   Granting ["*"] on sheet: "${key}"`);
      changed++;
    } else {
      console.log(`  ✔️   Already has ["*"] on sheet: "${key}" — skipped`);
    }
  }

  // 4. Save back
  if (changed > 0) {
    sabaAdmin.perSheetPermissions = new Map(Object.entries(currentPerms));
    await sabaAdmin.save();
    console.log(`\n✅  Done. Granted access to ${changed} new sheet(s) for SabaAdmin.`);
  } else {
    console.log('\n✅  SabaAdmin already had full access to all sheets. No changes needed.');
  }

  await mongoose.disconnect();
  console.log('🔌  Disconnected from MongoDB.');
  process.exit(0);
}

grantSabaAdminAllSheets().catch(err => {
  console.error('❌  Fatal error:', err);
  process.exit(1);
});
