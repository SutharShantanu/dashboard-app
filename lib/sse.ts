import connectToDatabase from "./mongodb";
import { SsePresenceModel } from "../models/SsePresence";
import Redis from "ioredis";

export type EventType = "cell_update" | "presence" | "cell_focus" | "cell_blur" | "presence_update_trigger";

export interface SseEvent {
  type: EventType;
  payload: any;
  senderId?: string;
}

export interface ClientConnection {
  id: string;
  username: string;
  controller: ReadableStreamDefaultController;
}

const INSTANCE_ID = crypto.randomUUID();
const REDIS_CHANNEL = "sse_events";

function createRedisClient() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    enableOfflineQueue: false,
  });
  // Suppress unhandled errors — callers handle rejections themselves.
  client.on("error", () => {});
  return client;
}

class SseManager {
  private clients: Set<ClientConnection> = new Set();
  // Subscriber is created lazily — NOT at class instantiation time.
  // This prevents ioredis from attempting TCP connections during next build.
  private subscriber: Redis | null = null;
  private initialized = false;

  constructor() {
    // Do NOT call initRedisSubscriber() here.
    // It will be called lazily on the first addClient() call at request time.
  }

  private getOrCreateSubscriber(): Redis {
    if (!this.subscriber) {
      this.subscriber = createRedisClient();
    }
    return this.subscriber;
  }

  private initRedisSubscriber() {
    if (this.initialized) return;
    this.initialized = true;

    const sub = this.getOrCreateSubscriber();

    sub.subscribe(REDIS_CHANNEL, (err) => {
      if (err) {
        console.error("[SSE] Failed to subscribe to Redis:", err);
      }
    });

    sub.on("message", async (channel, message) => {
      if (channel === REDIS_CHANNEL) {
        try {
          const event = JSON.parse(message) as SseEvent;
          if (event.senderId !== INSTANCE_ID) {
            if (event.type === "presence_update_trigger") {
              await this.broadcastMongoPresence();
            } else {
              this.localBroadcast({ type: event.type, payload: event.payload });
            }
          }
        } catch (e) {
          console.error("[SSE] Error parsing Redis message:", e);
        }
      }
    });
  }

  async addClient(client: ClientConnection) {
    // Initialize the Redis subscriber on the first real client connection
    // (i.e. at request time, never at build time).
    this.initRedisSubscriber();
    this.clients.add(client);
    await this.updatePresence(client.username, null);
  }

  async removeClient(client: ClientConnection) {
    this.clients.delete(client);
    await connectToDatabase();
    await SsePresenceModel.deleteOne({ username: client.username });

    // Trigger others to update their presence view
    this.broadcast({ type: "presence_update_trigger", payload: {} });
    await this.broadcastMongoPresence();
  }

  broadcast(event: SseEvent) {
    // 1. Broadcast locally first (instant for clients on this instance)
    this.localBroadcast(event);

    // 2. Broadcast via Redis to other instances — skip if no Redis configured
    if (!process.env.REDIS_URL && process.env.NODE_ENV !== "production") return;

    const payload = JSON.stringify({ ...event, senderId: INSTANCE_ID });
    const pub = createRedisClient();
    pub.publish(REDIS_CHANNEL, payload).catch((err) => {
      console.error("[SSE] Failed to broadcast via Redis:", err);
    });
  }

  private localBroadcast(event: SseEvent) {
    if (event.type === "presence_update_trigger") return;
    const dataToSend = { type: event.type, ...event.payload };
    const data = `data: ${JSON.stringify(dataToSend)}\n\n`;
    for (const client of this.clients) {
      try {
        client.controller.enqueue(new TextEncoder().encode(data));
      } catch {
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

    this.broadcast({ type: "presence_update_trigger", payload: {} });
    await this.broadcastMongoPresence();
  }

  private async broadcastMongoPresence() {
    try {
      await connectToDatabase();
      const docs = await SsePresenceModel.find({});
      const activeUsers = docs.map((doc) => ({
        username: doc.username,
        focusedCell: doc.focusedCell,
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

// Global singleton — persists across HMR in development.
const globalForSse = global as unknown as { sseManager: SseManager };
export const sseManager = globalForSse.sseManager || new SseManager();
if (process.env.NODE_ENV !== "production") globalForSse.sseManager = sseManager;
