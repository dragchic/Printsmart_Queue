import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ALLOWED_CHANGE_TYPES = ["RESTOCK", "ADJUSTMENT"] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const inventoryItemId = Number(body.inventory_item_id);
    const qty = Number(body.qty);
    const inputBy = body.input_by ? String(body.input_by).trim() : null;
    const note = body.note ? String(body.note).trim() : null;
    const changeType = String(body.change_type ?? "RESTOCK").trim().toUpperCase();

    if (!inventoryItemId || Number.isNaN(inventoryItemId)) {
      return NextResponse.json(
        { error: "inventory_item_id is required" },
        { status: 400 }
      );
    }

    if (Number.isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "qty must be a number > 0" },
        { status: 400 }
      );
    }

    if (!ALLOWED_CHANGE_TYPES.includes(changeType as (typeof ALLOWED_CHANGE_TYPES)[number])) {
      return NextResponse.json(
        { error: "change_type must be RESTOCK or ADJUSTMENT" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventory_item.findUnique({
        where: { inventory_item_id: inventoryItemId },
      });

      if (!item) {
        throw new Error("ITEM_NOT_FOUND");
      }

      const updatedItem = await tx.inventory_item.update({
        where: { inventory_item_id: inventoryItemId },
        data: {
          stock_current: {
            increment: qty,
          },
        },
      });

      const stockChange = await tx.inventory_stock_change.create({
        data: {
          inventory_item_id: inventoryItemId,
          qty_change: qty,
          change_type: changeType as "RESTOCK" | "ADJUSTMENT",
          note,
          input_by: inputBy,
        },
      });

      return {
        item: updatedItem,
        stock_change: stockChange,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("POST /api/owner/inventory/restock error:", error);

    if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to restock inventory" },
      { status: 500 }
    );
  }
}