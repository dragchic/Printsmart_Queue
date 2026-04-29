import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";
import { broadcastTicket } from "@/lib/ticket-bus";

export async function POST(req: Request) {
  try {
    await requireRole(["COUNTER_SERVICE", "OWNER"]);
    const body = await req.json();

    const ticketId = Number(body.ticket_id);

    const serviceOptionId =
      body.service_option_id !== undefined && body.service_option_id !== null
        ? Number(body.service_option_id)
        : null;

    const customServiceName = String(body.custom_service_name ?? "").trim();

    const orderQty =
      body.order_qty !== undefined && body.order_qty !== null
        ? Number(body.order_qty)
        : null;

    const note = String(body.note ?? "").trim();

    if (!ticketId || Number.isNaN(ticketId)) {
      return NextResponse.json({ error: "Invalid ticket_id" }, { status: 400 });
    }

    if (!serviceOptionId && !customServiceName) {
      return NextResponse.json(
        { error: "Please select a service option or input custom service name" },
        { status: 400 }
      );
    }

    if (!orderQty || Number.isNaN(orderQty) || orderQty < 1) {
      return NextResponse.json(
        { error: "Jumlah order minimal 1" },
        { status: 400 }
      );
    }

    if (serviceOptionId) {
      const option = await prisma.service_option.findUnique({
        where: { service_option_id: serviceOptionId },
      });

      if (!option || !option.is_active) {
        return NextResponse.json(
          { error: "Selected service option is invalid" },
          { status: 400 }
        );
      }
    }

    const item = await prisma.queue_ticket_item.create({
      data: {
        ticket_id: ticketId,
        service_option_id: serviceOptionId,
        custom_service_name: customServiceName || null,
        order_qty: orderQty,
        note: note || null,
      },
      include: {
        service_option: {
          select: {
            service_option_id: true,
            name: true,
          },
        },
        queue_ticket: {
          select: {
            ticket_id: true,
            queue_number: true,
            status: true,
          },
        },
      },
    });

    broadcastTicket({
      type: "machine_task_changed",
      action: "created",
      ticket_id: item.queue_ticket.ticket_id,
      queue_number: item.queue_ticket.queue_number,
      item_id: item.id,
      service_option:
        item.service_option?.name ?? item.custom_service_name ?? "Tipe Order",
      at: Date.now(),
    });

    return NextResponse.json(item);
  } catch (e) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;

    console.error(e);
    return NextResponse.json(
      { error: "Failed to add item" },
      { status: 500 }
    );
  }
}