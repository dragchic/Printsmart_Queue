import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Perbaiki RouteContext dengan mengganti 'id' menjadi 'ticketId'
type RouteContext = {
  params: Promise<{ ticketId: string }>;  // Gunakan 'ticketId' bukan 'id'
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { ticketId } = await context.params;  // Ambil 'ticketId' dari params
    const ticketIdNumber = Number(ticketId);  // Parsing menjadi number

    if (!ticketIdNumber || Number.isNaN(ticketIdNumber)) {
      return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
    }

    const ticket = await prisma.queue_ticket.findUnique({
      where: { ticket_id: ticketIdNumber },
      include: {
        customer: true,
        items: {
          include: {
            service_option: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load ticket detail" },
      { status: 500 }
    );
  }
}