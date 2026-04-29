import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastTicket } from "@/lib/ticket-bus";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    await requireRole(["COUNTER_SERVICE", "OWNER"]);

    const session = await getSession();
    const currentRole = session?.role ?? null;
    const currentUserId = session?.user_id ?? null;

    if (!currentUserId || !currentRole) {
      return NextResponse.json(
        { error: "Unauthorized: session not found" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const ticketId = Number(body.ticket_id);
    const nextStatus = String(body.status ?? "").trim().toUpperCase();

    const isDone = nextStatus === "DONE";
    const isSkipped = nextStatus === "SKIPPED";
    const isCancel = nextStatus === "CANCEL";

    if (!ticketId || Number.isNaN(ticketId)) {
      return NextResponse.json({ error: "Invalid ticket_id" }, { status: 400 });
    }

    if (!["DONE", "SKIPPED", "CANCEL"].includes(nextStatus)) {
      return NextResponse.json(
        { error: "Status must be DONE, SKIPPED or CANCEL" },
        { status: 400 }
      );
    }

    const ticket = await prisma.queue_ticket.findUnique({
      where: { ticket_id: ticketId },
      include: {
        customer: {
          select: {
            name: true,
            phone_number: true,
          },
        },
        items: true,
        handled_by_user: {
          select: {
            user_id: true,
            full_name: true,
            username: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // DONE hanya boleh dari SERVING
    if (isDone && ticket.status !== "SERVING") {
      return NextResponse.json(
        { error: "DONE is only allowed when ticket is in SERVING state" },
        { status: 400 }
      );
    }

    // SKIPPED boleh dari WAITING atau SERVING
    if (isSkipped && !["WAITING", "SERVING"].includes(ticket.status)) {
      return NextResponse.json(
        { error: "SKIPPED is only allowed when ticket is WAITING or SERVING" },
        { status: 400 }
      );
    }

    // CANCEL boleh dari WAITING atau SERVING
    if (isCancel && !["WAITING", "SERVING"].includes(ticket.status)) {
      return NextResponse.json(
        { error: "CANCEL is only allowed when ticket is WAITING or SERVING" },
        { status: 400 }
      );
    }

    // hanya CS pemilik ticket yang boleh update
    if (
      currentRole !== "OWNER" &&
      ticket.handled_by_id &&
      ticket.handled_by_id !== currentUserId
    ) {
      return NextResponse.json(
        { error: "This ticket is handled by another CS" },
        { status: 403 }
      );
    }

    // if (isDone && ticket.items.length === 0) {
    //   return NextResponse.json(
    //     { error: "Ticket has no order items yet" },
    //     { status: 400 }
    //   );
    // }

    const now = new Date();

    const updated = await prisma.queue_ticket.update({
      where: { ticket_id: ticketId },
      data: {
        status: nextStatus as "DONE" | "SKIPPED" | "CANCEL",
        finished_at: isDone ? now : null,
        skipped_at: isSkipped ? now : null,
        canceled_at: isCancel ? now : null,

        handled_by_id:
          !ticket.handled_by_id && currentRole !== "OWNER"
            ? currentUserId
            : ticket.handled_by_id,
      },
      include: {
        customer: {
          select: {
            name: true,
            phone_number: true,
          },
        },handled_by_user: {
          select: {
            user_id: true,
            full_name: true,
            username: true,
          },
        },
      },
    });

    broadcastTicket({
      type: "waiting_changed",
      action: "status_updated",
      ticket_id: updated.ticket_id,
      queue_number: updated.queue_number,
      status: updated.status,
      handled_by_id: updated.handled_by_id,
      handled_by_name:
        updated.handled_by_user?.full_name ??
        updated.handled_by_user?.username ??
        null,
      at: Date.now(),
    });

    broadcastTicket({
      action: isDone ? "ready" : nextStatus.toLowerCase(),
      ticket_id: updated.ticket_id,
      queue_number: updated.queue_number,
      pickup_status: updated.pickup_status,
      at: Date.now(),
    });

    return NextResponse.json(updated);
  } catch (e) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;

    console.error(e);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}