import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const inventoryItemId = Number(id);

    if (!inventoryItemId || Number.isNaN(inventoryItemId)) {
      return NextResponse.json(
        { error: "Invalid inventory item id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const name =
      body.name !== undefined ? String(body.name ?? "").trim() : undefined;
    const safeMinQty =
      body.safe_min_qty !== undefined ? Number(body.safe_min_qty) : undefined;
    const warningMinQty =
      body.warning_min_qty !== undefined ? Number(body.warning_min_qty) : undefined;
    const warningMaxQty =
      body.warning_max_qty !== undefined ? Number(body.warning_max_qty) : undefined;

    const stockAdd =
      body.stock_add !== undefined ? Number(body.stock_add) : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: "name cannot be empty" },
        { status: 400 }
      );
    }

    if (stockAdd !== undefined && (Number.isNaN(stockAdd) || stockAdd < 0)) {
      return NextResponse.json(
        { error: "stock_add must be a number >= 0" },
        { status: 400 }
      );
    }

    const current = await prisma.inventory_item.findUnique({
      where: { inventory_item_id: inventoryItemId },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const nextSafeMinQty =
      safeMinQty !== undefined ? safeMinQty : current.safe_min_qty;
    const nextWarningMinQty =
      warningMinQty !== undefined ? warningMinQty : current.warning_min_qty;
    const nextWarningMaxQty =
      warningMaxQty !== undefined ? warningMaxQty : current.warning_max_qty;

    if (
      Number.isNaN(nextSafeMinQty) ||
      Number.isNaN(nextWarningMinQty) ||
      Number.isNaN(nextWarningMaxQty)
    ) {
      return NextResponse.json(
        { error: "Stock thresholds must be valid numbers" },
        { status: 400 }
      );
    }

    if (
      nextSafeMinQty < 0 ||
      nextWarningMinQty < 0 ||
      nextWarningMaxQty < 0
    ) {
      return NextResponse.json(
        { error: "Stock thresholds must be >= 0" },
        { status: 400 }
      );
    }

    if (nextWarningMaxQty < nextWarningMinQty) {
      return NextResponse.json(
        { error: "warning_max_qty must be >= warning_min_qty" },
        { status: 400 }
      );
    }

    if (nextSafeMinQty < nextWarningMaxQty) {
      return NextResponse.json(
        { error: "safe_min_qty must be >= warning_max_qty" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventory_item.update({
        where: { inventory_item_id: inventoryItemId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(safeMinQty !== undefined ? { safe_min_qty: safeMinQty } : {}),
          ...(warningMinQty !== undefined
            ? { warning_min_qty: warningMinQty }
            : {}),
          ...(warningMaxQty !== undefined
            ? { warning_max_qty: warningMaxQty }
            : {}),
          ...(stockAdd && stockAdd > 0
            ? {
                stock_current: {
                  increment: stockAdd,
                },
              }
            : {}),
        },
      });

      if (stockAdd && stockAdd > 0) {
        await tx.inventory_stock_change.create({
          data: {
            inventory_item_id: inventoryItemId,
            qty_change: stockAdd,
            change_type: "RESTOCK",
            note: "Stock added from product settings",
            input_by: "owner",
          },
        });
      }

      return updatedItem;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("PATCH /api/owner/inventory/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
    try {
      const { id } = await context.params;
      const inventoryItemId = Number(id);
  
      if (!inventoryItemId || Number.isNaN(inventoryItemId)) {
        return NextResponse.json(
          { error: "Invalid inventory item id" },
          { status: 400 }
        );
      }
  
      const item = await prisma.inventory_item.findUnique({
        where: { inventory_item_id: inventoryItemId },
      });
  
      if (!item) {
        return NextResponse.json(
          { error: "Inventory item not found" },
          { status: 404 }
        );
      }
  
      const deleted = await prisma.inventory_item.update({
        where: { inventory_item_id: inventoryItemId },
        data: {
          is_active: false,
        },
      });
  
      return NextResponse.json(deleted);
    } catch (error) {
      console.error("DELETE inventory item error:", error);
      return NextResponse.json(
        { error: "Failed to delete inventory item" },
        { status: 500 }
      );
    }
  }