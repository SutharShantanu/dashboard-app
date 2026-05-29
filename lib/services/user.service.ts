import connectToDatabase from "../mongodb";
import User from "../../models/User";
import { appendAuditLog } from "./audit.service";
import { escapeRegex } from "../utils-internal";
import type { UserInterface } from "../sheets";

export async function getUsers(): Promise<UserInterface[]> {
  await connectToDatabase();
  const users = await User.find({});
  return users.map((u) => ({
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    passwordHash: u.passwordHash,
    role: u.role,
    allowedColumns: u.allowedColumns,
    permissionPreset: u.permissionPreset,
    perSheetPermissions: u.perSheetPermissions
      ? Object.fromEntries((u.perSheetPermissions as Map<string, string[]>).entries())
      : undefined,
    isActive: u.isActive ? "TRUE" : "FALSE",
    createdAt: u.createdAt.toISOString(),
    createdBy: u.createdBy,
    gender: u.gender || "",
    otpCode: u.otpCode,
    otpExpiry: u.otpExpiry ? u.otpExpiry.toISOString() : undefined,
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
    isActive: user.isActive === "TRUE",
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
    mongoUpdates.isActive = updates.isActive === "TRUE";
  }

  const escaped = escapeRegex(username);
  await User.updateOne(
    { username: { $regex: new RegExp(`^${escaped}$`, "i") } },
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
  const escaped = escapeRegex(username);
  await User.deleteOne({
    username: { $regex: new RegExp(`^${escaped}$`, "i") },
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
  allColumns: string[]
): string[] {
  const hasPerSheetConfig =
    user.perSheetPermissions &&
    Object.keys(user.perSheetPermissions).length > 0;

  if (hasPerSheetConfig) {
    const keys = Object.keys(user.perSheetPermissions!);
    const matchKey = keys.find(
      (k) => k.toLowerCase() === activeSheet.toLowerCase()
    );
    const sheetPerms = matchKey
      ? user.perSheetPermissions![matchKey]
      : undefined;

    if (sheetPerms && Array.isArray(sheetPerms)) {
      if (sheetPerms.includes("*")) return [...allColumns];
      return allColumns.filter((col) => sheetPerms.includes(col));
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
