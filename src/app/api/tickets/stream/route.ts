import { NextRequest } from "next/server";
import { addTicketListener, removeTicketListener } from "@/lib/ticket-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseMessage(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const safeEnqueue = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseMessage(payload)));
        } catch (err) {
          closed = true;
          removeTicketListener(listener);
          try {
            controller.close();
          } catch {}
        }
      };

      const listener = (payload: unknown) => {
        safeEnqueue(payload);
      };

      addTicketListener(listener);

      safeEnqueue({
        type: "connected",
        at: Date.now(),
      });

      const heartbeat = setInterval(() => {
        safeEnqueue({
          type: "heartbeat",
          at: Date.now(),
        });
      }, 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        removeTicketListener(listener);
        try {
          controller.close();
        } catch {}
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}