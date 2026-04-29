import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();

    // set ke jam 00:00:00
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    // besok jam 00:00:00
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);

    const selesai = await prisma.queue_ticket.findMany({
      where: {
        status: "DONE",
        ticket_date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        queue_number: "desc",
      },
      take: 12,
      select: {
        queue_number: true,
        status: true,
      },
    });

    const menunggu = await prisma.queue_ticket.findMany({
      where: {
        status: "WAITING",
        ticket_date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        queue_number: "asc",
      },
      take: 12,
      select: {
        queue_number: true,
        status: true,
      },
    });

    return NextResponse.json({
      selesai,
      menunggu,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Failed load queue board" },
      { status: 500 }
    );
  }
}