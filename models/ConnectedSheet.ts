import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConnectedSheet extends Document {
  spreadsheetId: string;
  title: string;
  sheetName: string;
  url: string;
  addedBy: string;
  createdAt: Date;
}

const ConnectedSheetSchema: Schema = new Schema({
  spreadsheetId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  sheetName: { type: String, required: true },
  url: { type: String, required: true },
  addedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ConnectedSheet: Model<IConnectedSheet> = mongoose.models.ConnectedSheet || mongoose.model<IConnectedSheet>('ConnectedSheet', ConnectedSheetSchema);

export default ConnectedSheet;
