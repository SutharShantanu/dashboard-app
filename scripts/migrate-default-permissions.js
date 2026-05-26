/**
 * scripts/migrate-default-permissions.js
 *
 * One-shot migration: removes all column permissions for every user
 * EXCEPT SabaAdmin. This ensures admins and sub-admins start with
 * no access until explicitly granted by SabaAdmin.
 *
 * Run with:
 *   node scripts/migrate-default-permissions.js
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

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// ── Main ───────────────────────────────────────────────────────────────────────

async function migrateDefaultPermissions() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI is not defined in .env or .env.local');
    process.exit(1);
  }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(uri);
  console.log('✅  Connected.\n');

  // Find all users EXCEPT SabaAdmin
  const targetUsers = await User.find({
    username: { $not: { $regex: /^SabaAdmin$/i } }
  });

  if (targetUsers.length === 0) {
    console.log('ℹ️   No target users found in the database. Nothing to do.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`📋  Found ${targetUsers.length} user(s) to reset:\n`);

  let changedCount = 0;

  for (const user of targetUsers) {
    const hasAllowedCols = user.allowedColumns !== "";
    const hasPerSheetPerms = user.perSheetPermissions && user.perSheetPermissions.size > 0;
    
    if (hasAllowedCols || hasPerSheetPerms) {
      console.log(`  ✏️   Resetting permissions for user: ${user.username} (${user.role})`);
      user.allowedColumns = "";
      user.perSheetPermissions = new Map();
      user.permissionPreset = "";
      await user.save();
      changedCount++;
    } else {
      console.log(`  ✔️   User already has no permissions: ${user.username} — skipped`);
    }
  }

  console.log(`\n✅  Done. Reset permissions for ${changedCount} user(s).`);

  await mongoose.disconnect();
  console.log('🔌  Disconnected from MongoDB.');
  process.exit(0);
}

migrateDefaultPermissions().catch(err => {
  console.error('❌  Fatal error:', err);
  process.exit(1);
});
