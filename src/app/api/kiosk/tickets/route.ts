import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastTicket } from "@/lib/ticket-bus";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name & phone required" },
        { status: 400 }
      );
    }

    if (!phone.startsWith("08")) {
      return NextResponse.json(
        { error: "Phone must start with 08" },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(phone)) {
      return NextResponse.json(
        { error: "Phone must be numeric" },
        { status: 400 }
      );
    }

    if (phone.length < 10 || phone.length > 13) {
      return NextResponse.json(
        { error: "Phone length must be 10–13 digits" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.upsert({
      where: { phone_number: phone },
      update: { name },
      create: { name, phone_number: phone },
    });

    const today = new Date();
    const ticketDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    for (let attempt = 0; attempt < 5; attempt++) {
      const last = await prisma.queue_ticket.findFirst({
        where: {
          ticket_date: ticketDate,
        },
        orderBy: {
          queue_number: "desc",
        },
        select: {
          queue_number: true,
        },
      });

      const nextNumber = (last?.queue_number ?? 0) + 1;

      try {
        const ticket = await prisma.queue_ticket.create({
          data: {
            ticket_date: ticketDate,
            queue_number: nextNumber,
            customer_id: customer.customer_id,
            status: "WAITING",
            handled_by_id: null,
          },
        });

        const queueCode = `A-${String(ticket.queue_number).padStart(3, "0")}`;

        broadcastTicket({
          type: "waiting_changed",
          action: "created",
          ticket_id: ticket.ticket_id,
          queue_number: ticket.queue_number,
          at: Date.now(),
        });

        return NextResponse.json(
          {
            ticket_id: ticket.ticket_id,
            ticket_date: ticket.ticket_date,
            queue_number: ticket.queue_number,
            queue_code: queueCode,
            status: ticket.status,
            handled_by_id: ticket.handled_by_id,
            customer: {
              name: customer.name,
              phone_number: customer.phone_number,
            },
          },
          { status: 201 }
        );
      } catch (e: any) {
        if (e?.code === "P2002") {
          continue;
        }

        console.error(e);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create ticket, please retry" },
      { status: 409 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}