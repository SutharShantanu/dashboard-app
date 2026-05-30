import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISseEvent extends Document {
  type: string;
  payload: any;
  senderId: string;
  createdAt: Date;
}

const SseEventSchema = new Schema<ISseEvent>({
  type: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  senderId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 15 } // Auto-delete documents after 15 seconds
});

export const SseEventModel: Model<ISseEvent> =
  mongoose.models.SseEvent || mongoose.model<ISseEvent>("SseEvent", SseEventSchema);
