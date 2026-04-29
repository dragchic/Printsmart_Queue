import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// RouteContext harus menggunakan 'ticketId'
type RouteContext = {
  params: Promise<{ ticketId: string }>;  // Pastikan menggunakan 'ticketId'
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const { ticketId } = await context.params;  // Ambil 'ticketId' dari params
    const ticketIdNum = Number(ticketId);  // Parsing menjadi number

    if (!ticketIdNum || Number.isNaN(ticketIdNum)) {
      return NextResponse.json(
        { error: "Invalid ticketId" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const inventoryItemId = Number(body.inventory_item_id);
    const qtyGood = Number(body.qty_good ?? 0);
    const qtyWaste = Number(body.qty_waste ?? 0);
    const inputBy = body.input_by ? String(body.input_by).trim() : null;
    const note = body.note ? String(body.note).trim() : null;

    if (!inventoryItemId || Number.isNaN(inventoryItemId)) {
      return NextResponse.json(
        { error: "inventory_item_id is required" },
        { status: 400 }
      );
    }

    if (Number.isNaN(qtyGood) || qtyGood < 0) {
      return NextResponse.json(
        { error: "qty_good must be a number >= 0" },
        { status: 400 }
      );
    }

    if (Number.isNaN(qtyWaste) || qtyWaste < 0) {
      return NextResponse.json(
        { error: "qty_waste must be a number >= 0" },
        { status: 400 }
      );
    }

    const qtyTotalUsed = qtyGood + qtyWaste;

    if (qtyTotalUsed <= 0) {
      return NextResponse.json(
        { error: "qty_good + qty_waste must be greater than 0" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.queue_ticket.findUnique({
        where: { ticket_id: ticketIdNum },
      });

      if (!ticket) {
        throw new Error("TICKET_NOT_FOUND");
      }

      const item = await tx.inventory_item.findUnique({
        where: { inventory_item_id: inventoryItemId },
      });

      if (!item) {
        throw new Error("ITEM_NOT_FOUND");
      }

      if (!item.is_active) {
        throw new Error("ITEM_INACTIVE");
      }

      if (item.stock_current < qtyTotalUsed) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const usage = await tx.order_inventory_usage.create({
        data: {
          ticket_id: ticketIdNum,
          inventory_item_id: inventoryItemId,
          qty_good: qtyGood,
          qty_waste: qtyWaste,
          qty_total_used: qtyTotalUsed,
          input_by: inputBy,
        },
      });

      if (qtyGood > 0) {
        await tx.inventory_stock_change.create({
          data: {
            inventory_item_id: inventoryItemId,
            ticket_id: ticketIdNum,
            qty_change: -qtyGood,
            change_type: "USAGE",
            note: note ?? "Material usage",
            input_by: inputBy,
          },
        });
      }

      if (qtyWaste > 0) {
        await tx.inventory_stock_change.create({
          data: {
            inventory_item_id: inventoryItemId,
            ticket_id: ticketIdNum,
            qty_change: -qtyWaste,
            change_type: "WASTE",
            note: note ?? "Material waste",
            input_by: inputBy,
          },
        });
      }

      const updatedItem = await tx.inventory_item.update({
        where: { inventory_item_id: inventoryItemId },
        data: {
          stock_current: {
            decrement: qtyTotalUsed,
          },
        },
      });

      await tx.queue_ticket.update({
        where: { ticket_id: ticketIdNum },
        data: {
          usage_submitted_at: new Date(),
        },
      });

      return {
        usage,
        updated_item: updatedItem,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("POST /api/tickets/[ticketId]/inventory-usage error:", error);

    if (error instanceof Error) {
      if (error.message === "TICKET_NOT_FOUND") {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }

      if (error.message === "ITEM_NOT_FOUND") {
        return NextResponse.json(
          { error: "Inventory item not found" },
          { status: 404 }
        );
      }

      if (error.message === "ITEM_INACTIVE") {
        return NextResponse.json(
          { error: "Inventory item is inactive" },
          { status: 400 }
        );
      }

      if (error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { error: "Insufficient stock" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to submit inventory usage" },
      { status: 500 }
    );
  }
}