import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodayRangeJakarta } from "@/lib/date";

export async function GET() {
  try {
    const { start, end } = getTodayRangeJakarta();

    const items = await prisma.queue_ticket.findMany({
      where: {
        status: "WAITING",
        created_at: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { queue_number: "asc" },
      include: {
        customer: {
          select: {
            name: true,
            phone_number: true,
          },
        },
      },
    });
    
    console.log("start", start);
    console.log("end", end);

    return NextResponse.json({ items });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load waiting list" }, { status: 500 });
  }
}
