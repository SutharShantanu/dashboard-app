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

  const stream = new ReadableStream({
    start(controller) {
      clientController = controller;
      
      const client: ClientConnection = {
        id: clientId,
        username: session.user.username,
        controller,
      };

      sseManager.addClient(client);

      // Send initial connection event
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected", id: clientId })}\n\n`)
      );

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        sseManager.removeClient(client);
      });
    },
    cancel() {
      // In case cancel is called instead of abort
      const client = { id: clientId, username: session.user.username, controller: clientController };
      sseManager.removeClient(client);
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
