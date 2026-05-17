export type EventType = "cell_update" | "presence" | "cell_focus" | "cell_blur";

export interface SseEvent {
  type: EventType;
  payload: any;
}

export interface ClientConnection {
  id: string;
  username: string;
  controller: ReadableStreamDefaultController;
}

class SseManager {
  private clients: Set<ClientConnection> = new Set();
  
  // Real-time presence state: username -> { lastSeen: Date, focusedCell: string | null }
  private presence: Map<string, { lastSeen: Date, focusedCell: string | null, active: boolean }> = new Map();

  addClient(client: ClientConnection) {
    this.clients.add(client);
    this.updatePresence(client.username, null);
  }

  removeClient(client: ClientConnection) {
    this.clients.delete(client);
    const userPresence = this.presence.get(client.username);
    if (userPresence) {
      userPresence.active = false;
    }
    this.broadcastPresence();
  }

  broadcast(event: SseEvent) {
    const dataToSend = { type: event.type, ...event.payload };
    const data = `data: ${JSON.stringify(dataToSend)}\n\n`;
    for (const client of this.clients) {
      try {
        client.controller.enqueue(new TextEncoder().encode(data));
      } catch (err) {
        // Stream closed or error
        this.removeClient(client);
      }
    }
  }

  updatePresence(username: string, focusedCell: string | null) {
    this.presence.set(username, {
      lastSeen: new Date(),
      focusedCell,
      active: true,
    });
    this.broadcastPresence();
  }

  private broadcastPresence() {
    const activeUsers = Array.from(this.presence.entries())
      .filter(([_, state]) => state.active && (Date.now() - state.lastSeen.getTime() < 60000)) // 1 min timeout
      .map(([username, state]) => ({ username, focusedCell: state.focusedCell }));

    this.broadcast({
      type: "presence",
      payload: { activeUsers },
    });
  }
}

// Global instance to persist across HMR in development
const globalForSse = global as unknown as { sseManager: SseManager };
export const sseManager = globalForSse.sseManager || new SseManager();
if (process.env.NODE_ENV !== "production") globalForSse.sseManager = sseManager;
