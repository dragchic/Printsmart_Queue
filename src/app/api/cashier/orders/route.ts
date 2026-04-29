import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["OWNER", "CASHIER"]);

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "not_taken";
    const q = (searchParams.get("q") ?? "").trim();

    let pickupStatus: "READY_NOT_TAKEN" | "TAKEN" | "EXPIRED" = "READY_NOT_TAKEN";

    if (tab === "taken") pickupStatus = "TAKEN";
    if (tab === "expired") pickupStatus = "EXPIRED";

    const items = await prisma.queue_ticket.findMany({
      where: {
        pickup_status: pickupStatus,
        OR: q
          ? [
              {
                customer: {
                  name: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
              {
                customer: {
                  phone_number: {
                    contains: q,
                  },
                },
              },
            ]
          : undefined,
      },
      include: {
        customer: true,
        items: {
          include: {
            service_option: true,
          },
        },
      },
      orderBy: [
        { pickup_ready_at: "desc" },
        { created_at: "desc" },
      ],
    });

    const result = items.map((ticket) => ({
      ticket_id: ticket.ticket_id,
      queue_number: ticket.queue_number,
      pickup_status: ticket.pickup_status,
      pickup_ready_at: ticket.pickup_ready_at,
      picked_up_at: ticket.picked_up_at,
      expired_at: ticket.expired_at,
      customer: {
        name: ticket.customer.name,
        phone_number: ticket.customer.phone_number,
      },
      products: ticket.items.map((item) => ({
        id: item.id,
        name:
          item.service_option?.name ??
          item.custom_service_name ??
          "Tipe Order",
        qty: item.order_qty,
      })),
    }));

    return NextResponse.json({ items: result });
  } catch (e) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;

    console.error(e);
    return NextResponse.json({ error: "Failed to load cashier orders" }, { status: 500 });
  }
}