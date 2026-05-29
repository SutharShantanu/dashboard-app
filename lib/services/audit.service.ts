import connectToDatabase from "../mongodb";
import AuditLog from "../../models/AuditLog";
import type { AuditLogInterface } from "../sheets";

export async function appendAuditLog(log: AuditLogInterface): Promise<void> {
  await connectToDatabase();
  await AuditLog.create({
    timestamp: new Date(log.timestamp),
    actor: log.actor,
    actorDisplayName: log.actorDisplayName,
    actorRole: log.actorRole,
    action: log.action,
    targetRow: log.targetRow,
    columnChanged: log.columnChanged || "",
    oldValue: log.oldValue || "",
    newValue: log.newValue || "",
    ip: log.ip || "127.0.0.1",
    userAgent: log.userAgent || "",
    details: log.details || `Action: ${log.action} on ${log.targetRow}`,
  });
}
