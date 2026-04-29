import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastTicket } from "@/lib/ticket-bus";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";

export async function POST(req: Request) {
  try {
    await requireRole(["COUNTER_SERVICE", "OWNER"]);
    const body = await req.json();

    const ticketId = Number(body.ticket_id);

    const pickupMethod =
      body.pickup_method !== undefined && body.pickup_method !== null
        ? String(body.pickup_method).trim().toUpperCase()
        : null;

    if (!ticketId || Number.isNaN(ticketId)) {
      return NextResponse.json(
        { error: "Invalid ticket_id" },
        { status: 400 }
      );
    }

    if (
      pickupMethod !== null &&
      !["DITUNGGU", "DITINGGAL"].includes(pickupMethod)
    ) {
      return NextResponse.json(
        { error: "Invalid pickup_method" },
        { status: 400 }
      );
    }

    const ticket = await prisma.queue_ticket.findUnique({
      where: { ticket_id: ticketId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    if (ticket.status !== "SERVING") {
      return NextResponse.json(
        { error: "Ticket is not in SERVING state" },
        { status: 400 }
      );
    }

    const updated = await prisma.queue_ticket.update({
      where: { ticket_id: ticketId },
      data: {
        pickup_method: pickupMethod as "DITUNGGU" | "DITINGGAL" | null,
      },
      include: {
        customer: true,
        items: {
          include: {
            service_option: true,
          },
        },
      },
    });

    broadcastTicket({
      type: "waiting_changed",
      action: "service_updated",
      ticket_id: updated.ticket_id,
      queue_number: updated.queue_number,
      status: updated.status,
      at: Date.now(),
    });

    return NextResponse.json(updated);
  } catch (e) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;

    console.error(e);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}