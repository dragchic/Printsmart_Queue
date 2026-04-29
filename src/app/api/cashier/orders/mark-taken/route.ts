import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    await requireRole(["CASHIER", "OWNER"]);
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        { error: "Only ready orders can be marked as taken" },
        { status: 400 }
      );
    }

    const updated = await prisma.queue_ticket.update({
      where: { ticket_id: ticketId },
      data: {
        pickup_status: "TAKEN",
        picked_up_at: new Date(),
        picked_up_by: session.user_id,
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
    return NextResponse.json({ error: "Failed to mark order as taken" }, { status: 500 });
  }
}