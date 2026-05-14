import { sseClients, updatePresence, removePresence, activeUsers } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get("username") || "Anonymous";
  const displayName = url.searchParams.get("displayName") || username;
  const color = url.searchParams.get("color") || "#3b82f6";
  const avatar = url.searchParams.get("avatar") || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  let clientController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      clientController = controller;
      sseClients.add(controller);

      updatePresence({
        username,
        displayName,
        avatar,
        color,
        lastAction: "Connected to dashboard",
        lastSeen: Date.now(),
      });

      // Send initial presence immediately
      const initialEvent = JSON.stringify({ type: "presence", activeUsers: Array.from(activeUsers.values()) });
      controller.enqueue(new TextEncoder().encode(`data: ${initialEvent}\n\n`));

      // Keep alive ping every 25 seconds
      const ping = setInterval(() => {
        try {
          updatePresence({
            username,
            displayName,
            avatar,
            color,
            lastAction: "Viewing dashboard",
            lastSeen: Date.now(),
          });
          controller.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch (err) {
          clearInterval(ping);
          sseClients.delete(controller);
          removePresence(username);
        }
      }, 25000);

      req.signal.addEventListener("abort", () => {
        clearInterval(ping);
        sseClients.delete(controller);
        removePresence(username);
      });
    },
    cancel() {
      if (clientController) {
        sseClients.delete(clientController);
      }
      removePresence(username);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
