import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastToTV } from "@/lib/tv-bus";
import { broadcastTicket } from "@/lib/ticket-bus";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";
import { getSession } from "@/lib/session";
import { tr } from "framer-motion/client";

export async function POST(req: Request) {
  try {
    await requireRole(["COUNTER_SERVICE", "OWNER"]);
    const session = await getSession();
    const currentUserId = session?.user_id ?? null;


    const body = await req.json();
    const ticketId = Number(body.ticket_id);

    if (!ticketId) {
      return NextResponse.json({ error: "ticket_id required" }, { status: 400 });
    }

    // memastikan ticket masih WAITING (hindari double-call)
    const ticket = await prisma.queue_ticket.findUnique({
      where: { ticket_id: ticketId },
      include: { customer: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (ticket.status !== "WAITING") {
      return NextResponse.json({ error: "Ticket is not WAITING" }, { status: 400 });
    }

    const updated = await prisma.queue_ticket.update({
      where: { ticket_id: ticketId },
      data: {
        status: "SERVING",
        called_at: new Date(),
        handled_by_id: currentUserId,
      },
      include: { customer: true,
        handled_by_user: {
          select: {
            user_id: true,
            full_name: true,
            username: true,
          }
        }
       },
    });
    console.log("updated ticket:", updated)

    broadcastTicket({
      type: "waiting_changed",
      action: "called",
      ticket_id: updated.ticket_id,
      queue_number: updated.queue_number,
      handled_by_id: updated.handled_by_id,
      handled_by_name:
        updated.handled_by_user?.full_name ??
        updated.handled_by_user?.username ??
        null,
      at: Date.now(),
    });


    const next = await prisma.queue_ticket.findFirst({
        where: {
          status: "WAITING",
        //   ticket_date: updated.ticket_date,
        },
        orderBy: { queue_number: "asc" },
        select: { queue_number: true },
    });
  
    broadcastToTV({
        type: "call",
        now: updated.queue_number,
        next: next?.queue_number ?? null,
        at: Date.now(),
    });

    return NextResponse.json({
      ticket_id: updated.ticket_id,
      queue_number: updated.queue_number,
      status: updated.status,
      handled_by_id: updated.handled_by_id,
      handled_by_name:
        updated.handled_by_user?.full_name ??
        updated.handled_by_user?.username ??
        null,
      customer: {
        name: updated.customer.name,
        phone_number: updated.customer.phone_number,
      },
    });
  } catch (e) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;

    console.error(e);
    return NextResponse.json({ error: "Failed to call ticket" }, { status: 500 });
  }
}
