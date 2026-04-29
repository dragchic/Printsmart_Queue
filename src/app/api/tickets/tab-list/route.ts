import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodayRangeJakarta } from "@/lib/date";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["COUNTER_SERVICE", "OWNER"]);

    const session = await getSession();
    const currentUserId = session?.user_id ?? null;
    const currentRole = session?.role ?? null;

    if (!currentUserId || !currentRole) {
      return NextResponse.json(
        { error: "Unauthorized: session not found" },
        { status: 401 }
      );
    }

    const tab = req.nextUrl.searchParams.get("tab");
    console.log("tab from frontend =", tab);

    if (!tab || !["active", "in_serving", "completed"].includes(tab)) {
      return NextResponse.json(
        { error: "Invalid tab value" },
        { status: 400 }
      );
    }

    const { start, end } = getTodayRangeJakarta();
    console.log("start =", start);
    console.log("end =", end);

    let whereClause: any = {};

    if (tab === "active") {
      whereClause = {
        status: "WAITING",
        created_at: {
          gte: start,
          lt: end,
        },
      };
    } else if (tab === "in_serving") {
      whereClause = {
        status: "SERVING",
        created_at: {
          gte: start,
          lt: end,
        },
        ...(currentRole === "OWNER" ? {} : { handled_by_id: currentUserId }),
      };
    } else if (tab === "completed") {
      whereClause = {
        status: {
          in: ["DONE", "SKIPPED", "CANCEL"],
        },
        created_at: {
          gte: start,
          lt: end,
        },
      };
    }

    console.log("whereClause =", whereClause);

    const items = await prisma.queue_ticket.findMany({
      where: whereClause,
      orderBy: [{ queue_number: "asc" }],
      include: {
        customer: {
          select: {
            name: true,
            phone_number: true,
          },
        },
        handled_by_user: {
          select: {
            user_id: true,
            username: true,
            full_name: true,
          },
        },
        machine_notified_by_user: {
          select: {
            user_id: true,
            username: true,
            full_name: true,
          },
        },
        pickup_cashier: {
          select: {
            user_id: true,
            username: true,
            full_name: true,
          },
        },
        items: {
          include: {
            service_option: {
              select: {
                service_option_id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // console.log("items found =", items.length);
    // console.log("items =", items);

    const mappedItems = items.map((item) => ({
      ...item,
      handled_by_name:
        item.handled_by_user?.full_name ??
        item.handled_by_user?.username ??
        null,
      machine_notified_by_name:
        item.machine_notified_by_user?.full_name ??
        item.machine_notified_by_user?.username ??
        null,
      picked_up_by_name:
        item.pickup_cashier?.full_name ??
        item.pickup_cashier?.username ??
        null,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;

    console.error(e);
    return NextResponse.json(
      { error: "Failed to load ticket list" },
      { status: 500 }
    );
  }
}