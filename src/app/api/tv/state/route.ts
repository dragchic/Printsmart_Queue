import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// this is for initial state & live update

export async function GET() {
  try {
    console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
    console.log("DATABASE_URL raw:", process.env.DATABASE_URL);
    
    const nowServing = await prisma.queue_ticket.findFirst({
      where: { status: "SERVING" },
      orderBy: { called_at: "desc" },
      select: { queue_number: true },
    });

    const nextWaiting = await prisma.queue_ticket.findFirst({
      where: { status: "WAITING" },
      orderBy: { queue_number: "asc" },
      select: { queue_number: true },
    });

    return NextResponse.json({
      now: nowServing?.queue_number ?? null,
      next: nextWaiting?.queue_number ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load TV state" }, { status: 500 });
  }
}