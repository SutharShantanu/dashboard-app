import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPermissionPreset extends Document {
  name: string;
  description?: string;
  permissions: Map<string, string[]>; // sheetId -> columns
  createdAt: Date;
  createdBy: string;
}

const PermissionPresetSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  permissions: { 
    type: Map, 
    of: [String],
    default: {}
  },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true }
});

const PermissionPreset: Model<IPermissionPreset> = mongoose.models.PermissionPreset || mongoose.model<IPermissionPreset>('PermissionPreset', PermissionPresetSchema);

export default PermissionPreset;
