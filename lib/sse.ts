export interface ActiveUser {
  username: string;
  displayName: string;
  avatar: string;
  color: string;
  lastAction: string;
  lastSeen: number;
}

export type SSEEvent =
  | { type: "cell_update"; studentId: string; col: string; value: string; by: string; sheet?: string; spreadsheetId?: string }
  | { type: "presence"; activeUsers: ActiveUser[] }
  | { type: "cell_focus"; studentId: string; col: string; user: string; color: string }
  | { type: "cell_blur"; studentId: string; col: string; user: string };

const globalAny = globalThis as any;

if (!globalAny.sseClients) {
  globalAny.sseClients = new Set<ReadableStreamDefaultController>();
}
if (!globalAny.activeUsers) {
  globalAny.activeUsers = new Map<string, ActiveUser>();
}

export const sseClients: Set<ReadableStreamDefaultController> = globalAny.sseClients;
export const activeUsers: Map<string, ActiveUser> = globalAny.activeUsers;

export function broadcastSSE(event: SSEEvent) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(payload);

  for (const client of sseClients) {
    try {
      client.enqueue(encoded);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

export function updatePresence(user: ActiveUser) {
  activeUsers.set(user.username, { ...user, lastSeen: Date.now() });
  
  // Clean up inactive users older than 2 minutes
  const now = Date.now();
  for (const [username, activeUser] of activeUsers.entries()) {
    if (now - activeUser.lastSeen > 120000) {
      activeUsers.delete(username);
    }
  }
  
  broadcastSSE({ type: "presence", activeUsers: Array.from(activeUsers.values()) });
}

export function removePresence(username: string) {
  if (activeUsers.has(username)) {
    activeUsers.delete(username);
    broadcastSSE({ type: "presence", activeUsers: Array.from(activeUsers.values()) });
  }
}
