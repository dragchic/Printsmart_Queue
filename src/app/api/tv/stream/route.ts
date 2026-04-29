import { NextRequest } from "next/server";
import { addTVListener, removeTVListener } from "@/lib/tv-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseMessage(data: any) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // listener untuk client ini
      const listener = (payload: any) => {
        controller.enqueue(encoder.encode(sseMessage(payload)));
      };

      addTVListener(listener);

      controller.enqueue(
        encoder.encode(
          sseMessage({
            type: "connected",
            at: Date.now(),
          })
        )
      );

      // heartbeat tiap 15 detik supaya koneksi tidak dianggap mati
      const heartbeat = setInterval(() => {
        controller.enqueue(
          encoder.encode(
            sseMessage({
              type: "heartbeat",
              at: Date.now(),
            })
          )
        );
      }, 15000);

      const cleanup = () => {
        clearInterval(heartbeat);
        removeTVListener(listener);
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