import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  timestamp: Date;
  actor: string;
  actorDisplayName: string;
  actorRole: string;
  action: "READ" | "WRITE" | "USER_CREATE" | "USER_UPDATE" | "USER_DEACTIVATE" | "USER_ACTIVATE" | "STUDENT_CREATE";
  targetRow: string;
  details: string;
}

const AuditLogSchema: Schema = new Schema({
  timestamp: { type: Date, default: Date.now },
  actor: { type: String, required: true },
  actorDisplayName: { type: String, required: true },
  actorRole: { type: String, required: true },
  action: { 
    type: String, 
    enum: ["READ", "WRITE", "USER_CREATE", "USER_UPDATE", "USER_DEACTIVATE", "USER_ACTIVATE", "STUDENT_CREATE"],
    required: true 
  },
  targetRow: { type: String, required: true },
  details: { type: String, required: true }
});

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
