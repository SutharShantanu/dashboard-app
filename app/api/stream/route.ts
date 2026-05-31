import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { sseManager, ClientConnection } from "../../../lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientId = crypto.randomUUID();

  let clientController: ReadableStreamDefaultController;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      clientController = controller;

      const client: ClientConnection = {
        id: clientId,
        username: session.user.username,
        controller,
      };

      await sseManager.addClient(client);

      // Send initial connection event
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected", id: clientId })}\n\n`)
      );

      // Heartbeat: send an SSE comment every 25 seconds.
      // This prevents serverless platforms (Vercel, AWS Lambda) from killing
      // the connection at their idle timeout (typically 10–60 s).
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          // Controller closed — clear interval and remove client
          clearInterval(heartbeatTimer);
          sseManager.removeClient(client).catch(console.error);
        }
      }, 25_000);

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatTimer);
        sseManager.removeClient(client).catch(console.error);
      });
    },
    cancel() {
      // In case cancel is called instead of abort
      clearInterval(heartbeatTimer);
      const client = { id: clientId, username: session.user.username, controller: clientController };
      sseManager.removeClient(client).catch(console.error);
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering for SSE
    },
  });
}
