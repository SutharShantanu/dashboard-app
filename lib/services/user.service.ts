import connectToDatabase from "../mongodb";
import User from "../../models/User";
import { appendAuditLog } from "./audit.service";
import { escapeRegex } from "../utils-internal";
import type { UserInterface } from "../sheets";

export async function getUsers(): Promise<UserInterface[]> {
  await connectToDatabase();
  const users = await User.find({}).lean();
  return users.map((u) => ({
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    passwordHash: u.passwordHash,
    role: u.role,
    allowedColumns: u.allowedColumns,
    permissionPreset: u.permissionPreset,
    perSheetPermissions: u.perSheetPermissions && typeof (u.perSheetPermissions as any).entries === 'function'
      ? Object.fromEntries((u.perSheetPermissions as any).entries())
      : (u.perSheetPermissions as Record<string, string[]> | undefined),
    isActive: u.isActive,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : new Date(u.createdAt).toISOString(),
    createdBy: u.createdBy,
    gender: u.gender || "",
    otpCode: u.otpCode,
    otpExpiry: u.otpExpiry ? (u.otpExpiry instanceof Date ? u.otpExpiry.toISOString() : new Date(u.otpExpiry).toISOString()) : undefined,
  }));
}

export async function createUser(
  user: UserInterface,
  actor: string = "system",
  actorRole: string = "system",
  ip: string = "127.0.0.1"
): Promise<void> {
  await connectToDatabase();
  await User.create({
    ...user,
    isActive: user.isActive,
    createdAt: new Date(user.createdAt),
  });

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    actorDisplayName: actor,
    actorRole,
    action: "USER_CREATE",
    targetRow: user.username,
    ip,
    details: `Created user account: ${user.username} (${user.role})`,
  });
}

export async function updateUser(
  username: string,
  updates: Partial<UserInterface>,
  actor: string = "system",
  actorRole: string = "system",
  ip: string = "127.0.0.1"
): Promise<void> {
  await connectToDatabase();
  const mongoUpdates: Record<string, unknown> = { ...updates };
  if (updates.isActive !== undefined) {
    mongoUpdates.isActive = updates.isActive;
  }

  // Optimize: Use exact lowercase match to hit the unique index (O(1)) instead of an unindexed case-insensitive regex (O(n) COLLSCAN)
  await User.updateOne(
    { username: username.trim().toLowerCase() },
    { $set: mongoUpdates }
  );

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    actorDisplayName: actor,
    actorRole,
    action: "USER_UPDATE",
    targetRow: username,
    ip,
    details: `Updated user account: ${username}. Changes: ${Object.keys(updates).join(", ")}`,
  });
}

export async function deleteUser(
  username: string,
  actor: string = "system",
  actorRole: string = "system",
  ip: string = "127.0.0.1"
): Promise<void> {
  await connectToDatabase();
  // Optimize: Use exact lowercase match to hit the unique index (O(1)) instead of an unindexed case-insensitive regex (O(n) COLLSCAN)
  await User.deleteOne({
    username: username.trim().toLowerCase(),
  });

  await appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    actorDisplayName: actor,
    actorRole,
    action: "USER_DELETE",
    targetRow: username,
    ip,
    details: `Deleted user account: ${username}`,
  });
}

export function resolveUserAllowedColumns(
  user: {
    role: "admin" | "sub-admin";
    allowedColumns: string;
    perSheetPermissions?: Record<string, string[]>;
  },
  activeSheet: string,
  allColumns: string[],
  spreadsheetId?: string
): string[] {
  const hasPerSheetConfig =
    user.perSheetPermissions &&
    Object.keys(user.perSheetPermissions).length > 0;

  if (hasPerSheetConfig) {
    const keys = Object.keys(user.perSheetPermissions!);
    const matchKey = keys.find(
      (k) =>
        k.toLowerCase() === activeSheet.toLowerCase() ||
        (spreadsheetId && k === spreadsheetId)
    );
    const sheetPerms = matchKey
      ? user.perSheetPermissions![matchKey]
      : undefined;

    if (sheetPerms && Array.isArray(sheetPerms)) {
      if (sheetPerms.some(p => p.trim() === "*")) return [...allColumns];
      const trimmedPerms = sheetPerms.map((c: string) => c.trim());
      return allColumns.filter((col) => trimmedPerms.includes(col.trim()));
    }
    if (user.role === "admin") return [...allColumns];
    return [];
  }

  if (user.allowedColumns) {
    if (
      user.allowedColumns === "*" ||
      user.allowedColumns.toLowerCase() === "all"
    ) {
      return [...allColumns];
    }
    const list = user.allowedColumns.split(",").map((c) => c.trim());
    return allColumns.filter((col) => list.includes(col));
  }

  if (user.role === "admin") return [...allColumns];
  return [];
}
