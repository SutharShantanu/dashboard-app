import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: "admin" | "sub-admin";
  allowedColumns: string; // Comma-separated list
  permissionPreset?: string;
  perSheetPermissions?: Map<string, string[]>;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  gender?: string; // New field
  otpCode?: string;
  otpExpiry?: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "sub-admin"], required: true },
  allowedColumns: { type: String, default: "" },
  permissionPreset: { type: String },
  perSheetPermissions: { type: Map, of: [String], default: {} },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  gender: { type: String, default: "" }, // New field
  otpCode: { type: String },
  otpExpiry: { type: Date }
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
