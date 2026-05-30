import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISsePresence extends Document {
  username: string;
  focusedCell: string | null;
  updatedAt: Date;
}

const SsePresenceSchema = new Schema<ISsePresence>({
  username: { type: String, required: true, unique: true },
  focusedCell: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now }
});

// Create TTL index so presence drops off after 60s of inactivity
SsePresenceSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 });

export const SsePresenceModel: Model<ISsePresence> =
  mongoose.models.SsePresence || mongoose.model<ISsePresence>("SsePresence", SsePresenceSchema);
