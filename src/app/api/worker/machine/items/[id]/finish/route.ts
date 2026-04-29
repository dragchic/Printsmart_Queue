import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";
import { broadcastTicket } from "@/lib/ticket-bus";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await requireRole(["MACHINE", "OWNER"]);
    const body = await req.json();

    const { id } = await context.params;
    const itemId = Number(id);

    const machineNote = String(body.machine_note ?? "").trim();
    const materialsUsage = Array.isArray(body.materials_usage)
      ? body.materials_usage
      : null;

    if (!itemId || Number.isNaN(itemId)) {
      return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
    }

    if (!materialsUsage || materialsUsage.length === 0) {
      return NextResponse.json(
        { error: "materials_usage is required" },
        { status: 400 }
      );
    }

    const item = await prisma.queue_ticket_item.findUnique({
      where: { id: itemId },
      include: {
        queue_ticket: {
          include: {
            customer: true,
            handled_by_user: {
                select: {
                  user_id: true,
                  username: true,
                  full_name: true,
                },
              },
          },
        },
        service_option: true,
        materials: {
          include: {
            inventory_item: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.machine_status === "DONE") {
      return NextResponse.json(
        { error: "Item already finished" },
        { status: 400 }
      );
    }

    const materialMap = new Map(
      item.materials.map((m) => [m.queue_ticket_item_material_id, m])
    );

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      for (const usage of materialsUsage) {
        const materialId = Number(usage.queue_ticket_item_material_id);
        const qtyGood = Number(usage.qty_good ?? 0);
        const qtyWaste = Number(usage.qty_waste ?? 0);
        const total = qtyGood + qtyWaste;

        const material = materialMap.get(materialId);

        if (!material) {
          throw new Error("Material not found in this item");
        }

        if (total <= 0) {
          throw new Error("Invalid material usage");
        }

        if (material.inventory_item.stock_current < total) {
          throw new Error(
            `Stock not enough for ${material.inventory_item.name}`
          );
        }

        await tx.queue_ticket_item_material_usage.create({
          data: {
            queue_ticket_item_material_id: materialId,
            qty_good: qtyGood,
            qty_waste: qtyWaste,
            qty_total_used: total,
            input_by: session.full_name,
          },
        });

        await tx.inventory_item.update({
          where: {
            inventory_item_id: material.inventory_item_id,
          },
          data: {
            stock_current: {
              decrement: total,
            },
          },
        });

        await tx.inventory_stock_change.create({
          data: {
            inventory_item_id: material.inventory_item_id,
            ticket_id: item.ticket_id,
            qty_change: -total,
            change_type: "USAGE",
            input_by: session.full_name,
            note: `Usage for item ${item.id}`,
          },
        });
      }

      const updatedItem = await tx.queue_ticket_item.update({
        where: { id: itemId },
        data: {
          machine_status: "DONE",
          machine_note: machineNote || null,
          processed_by: session.full_name,
          machine_finished_at: now,
        },
        include: {
            queue_ticket: {
              include: {
                handled_by_user: {
                  select: {
                    user_id: true,
                    username: true,
                    full_name: true,
                  },
                },
              },
            },
            service_option: true,
          },
      });

      const remaining = await tx.queue_ticket_item.count({
        where: {
          ticket_id: item.ticket_id,
          machine_status: { not: "DONE" },
        },
      });

      let updatedTicket = null;

      if (remaining === 0) {
        updatedTicket = await tx.queue_ticket.update({
          where: { ticket_id: item.ticket_id },
          data: {
            pickup_status: "READY_NOT_TAKEN",
            pickup_ready_at: now,
            machine_done_at: now,
            machine_notified_by_id: session.user_id,
            machine_notified_at: now,
          },
          include: {
            customer: true,
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
            items: {
              include: {
                service_option: true,
              },
            },
          },
        });
      }

      return { updatedItem, updatedTicket, remaining };
    });

    broadcastTicket({
      type: "machine_task_changed",
      action: "finished",
      ticket_id: result.updatedItem.queue_ticket.ticket_id,
      queue_number: result.updatedItem.queue_ticket.queue_number,
      item_id: result.updatedItem.id,
      at: Date.now(),
    });

    if (result.updatedTicket) {
        broadcastTicket({
            type: "cs_notification",
            message: `Order ${result.updatedTicket.queue_number} selesai dikerjakan`,
            ticket_id: result.updatedTicket.ticket_id,
            queue_number: result.updatedTicket.queue_number,
            customer_name: result.updatedTicket.customer.name,
            handled_by_id: result.updatedTicket.handled_by_id,
            handled_by_name:
              result.updatedTicket.handled_by_user?.full_name ??
              result.updatedTicket.handled_by_user?.username ??
              null,
            at: Date.now(),
          });

          broadcastTicket({
            type: "pickup_status_changed",
            ticket_id: result.updatedTicket.ticket_id,
            pickup_status: result.updatedTicket.pickup_status,
            handled_by_id: result.updatedTicket.handled_by_id,
            handled_by_name:
              result.updatedTicket.handled_by_user?.full_name ??
              result.updatedTicket.handled_by_user?.username ??
              null,
            at: Date.now(),
          });
    }

    return NextResponse.json({
      success: true,
      item: result.updatedItem,
      ticket_completed: result.remaining === 0,
      ticket: result.updatedTicket,
    });
  } catch (e) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;

    console.error(e);

    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to finish item",
      },
      { status: 500 }
    );
  }
}