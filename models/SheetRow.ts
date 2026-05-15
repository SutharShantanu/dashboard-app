import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISheetRow extends Document {
  rowId: string;
  sheetId: string; // The identifier for the sheet/tab
  data: Record<string, any>;
  lastModifiedBy: string;
  lastModifiedAt: Date;
}

const SheetRowSchema: Schema = new Schema({
  rowId: { type: String, required: true },
  sheetId: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  lastModifiedBy: { type: String, required: true },
  lastModifiedAt: { type: Date, default: Date.now }
});

// Ensure rowId is unique per sheet
SheetRowSchema.index({ sheetId: 1, rowId: 1 }, { unique: true });

const SheetRow: Model<ISheetRow> = mongoose.models.SheetRow || mongoose.model<ISheetRow>('SheetRow', SheetRowSchema);

export default SheetRow;
