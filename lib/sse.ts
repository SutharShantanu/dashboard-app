import connectToDatabase from "./mongodb";
import { SseEventModel } from "../models/SseEvent";
import { SsePresenceModel } from "../models/SsePresence";

export type EventType = "cell_update" | "presence" | "cell_focus" | "cell_blur" | "presence_update_trigger";

export interface SseEvent {
  type: EventType;
  payload: any;
}

export interface ClientConnection {
  id: string;
  username: string;
  controller: ReadableStreamDefaultController;
}

// Unique ID for this serverless instance to prevent processing its own broadcasts
const INSTANCE_ID = crypto.randomUUID();

class SseManager {
  private clients: Set<ClientConnection> = new Set();
  private initialized = false;

  constructor() {
    this.initMongoWatcher();
  }

  private async initMongoWatcher() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await connectToDatabase();
      const changeStream = SseEventModel.watch([], { fullDocument: 'updateLookup' });
      
      changeStream.on('change', async (change) => {
        if (change.operationType === 'insert') {
          const event = change.fullDocument;
          if (event && event.senderId !== INSTANCE_ID) {
            if (event.type === 'presence_update_trigger') {
              await this.broadcastMongoPresence();
            } else {
              this.localBroadcast({ type: event.type as EventType, payload: event.payload });
            }
          }
        }
      });
    } catch (err) {
      console.error("[SSE] Failed to initialize MongoDB Change Stream:", err);
    }
  }

  async addClient(client: ClientConnection) {
    this.clients.add(client);
    await this.updatePresence(client.username, null);
  }

  async removeClient(client: ClientConnection) {
    this.clients.delete(client);
    await connectToDatabase();
    await SsePresenceModel.deleteOne({ username: client.username });
    
    // Trigger others to update their presence view
    this.broadcast({ type: "presence_update_trigger", payload: {} });
    await this.broadcastMongoPresence(); // Update local clients
  }

  broadcast(event: SseEvent) {
    // 1. Broadcast locally first (instant for clients connected to this instance)
    this.localBroadcast(event);

    // 2. Broadcast via MongoDB to other Vercel instances
    connectToDatabase().then(() => {
      return SseEventModel.create({
        type: event.type,
        payload: event.payload,
        senderId: INSTANCE_ID
      });
    }).catch(err => {
      console.error("[SSE] Failed to broadcast via MongoDB:", err);
    });
  }

  private localBroadcast(event: SseEvent) {
    if (event.type === "presence_update_trigger") return;
    const dataToSend = { type: event.type, ...event.payload };
    const data = `data: ${JSON.stringify(dataToSend)}\n\n`;
    for (const client of this.clients) {
      try {
        client.controller.enqueue(new TextEncoder().encode(data));
      } catch (err) {
        this.removeClient(client).catch(console.error);
      }
    }
  }

  async updatePresence(username: string, focusedCell: string | null) {
    await connectToDatabase();
    await SsePresenceModel.findOneAndUpdate(
      { username },
      { focusedCell, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    
    // Trigger others to fetch presence
    this.broadcast({ type: "presence_update_trigger", payload: {} });
    await this.broadcastMongoPresence();
  }

  private async broadcastMongoPresence() {
    try {
      await connectToDatabase();
      const docs = await SsePresenceModel.find({});
      const activeUsers = docs.map(doc => ({
        username: doc.username,
        focusedCell: doc.focusedCell
      }));

      this.localBroadcast({
        type: "presence",
        payload: { activeUsers },
      });
    } catch (err) {
      console.error("[SSE] Error broadcasting Mongo presence", err);
    }
  }
}

// Global instance to persist across HMR in development.
const globalForSse = global as unknown as { sseManager: SseManager };
export const sseManager = globalForSse.sseManager || new SseManager();
if (process.env.NODE_ENV !== "production") globalForSse.sseManager = sseManager;
