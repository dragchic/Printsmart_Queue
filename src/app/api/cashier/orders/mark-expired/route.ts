import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleAuthError } from "@/lib/api-auth";
import { requireRole } from "@/lib/authorization";

export async function POST(req: Request) {
  try {
    await requireRole(["CASHIER", "OWNER"]);

    const body = await req.json();
    const ticketId = Number(body.ticket_id);

    if (!ticketId) {
      return NextResponse.json({ error: "ticket_id is required" }, { status: 400 });
    }

    const ticket = await prisma.queue_ticket.findUnique({
      where: { ticket_id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.pickup_status !== "READY_NOT_TAKEN") {
      return NextResponse.json(
        { error: "Only ready orders can be marked as expired" },
        { status: 400 }
      );
    }

    if (!ticket.pickup_ready_at) {
      return NextResponse.json(
        { error: "pickup_ready_at is missing" },
        { status: 400 }
      );
    }

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const isEligible =
      Date.now() - new Date(ticket.pickup_ready_at).getTime() >= THIRTY_DAYS_MS;

    if (!isEligible) {
      return NextResponse.json(
        { error: "Order cannot be marked expired before 30 days" },
        { status: 400 }
      );
    }

    const updated = await prisma.queue_ticket.update({
      where: { ticket_id: ticketId },
      data: {
        pickup_status: "EXPIRED",
        expired_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      item: updated,
    });
  } catch (e) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;

    console.error(e);
    return NextResponse.json({ error: "Failed to mark order as expired" }, { status: 500 });
  }
}