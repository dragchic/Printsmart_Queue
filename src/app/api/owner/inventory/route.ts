import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const unit = String(body.unit ?? "").trim();
    const stockInitial = Number(body.stock_initial ?? 0);
    const inputBy = body.input_by ? String(body.input_by).trim() : null;
    const note = body.note ? String(body.note).trim() : "Initial stock";

    const safeMinQty = Number(body.safe_min_qty ?? 100);
    const warningMinQty = Number(body.warning_min_qty ?? 20);
    const warningMaxQty = Number(body.warning_max_qty ?? 100);

    if (!name || !unit) {
      return NextResponse.json(
        { error: "name and unit are required" },
        { status: 400 }
      );
    }

    if (Number.isNaN(stockInitial) || stockInitial < 0) {
      return NextResponse.json(
        { error: "stock_initial must be a number >= 0" },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(safeMinQty) ||
      Number.isNaN(warningMinQty) ||
      Number.isNaN(warningMaxQty)
    ) {
      return NextResponse.json(
        { error: "Stock thresholds must be valid numbers" },
        { status: 400 }
      );
    }

    if (warningMinQty < 0 || warningMaxQty < 0 || safeMinQty < 0) {
      return NextResponse.json(
        { error: "Stock thresholds must be >= 0" },
        { status: 400 }
      );
    }

    if (warningMaxQty < warningMinQty) {
      return NextResponse.json(
        { error: "warning_max_qty must be >= warning_min_qty" },
        { status: 400 }
      );
    }

    if (safeMinQty < warningMaxQty) {
      return NextResponse.json(
        { error: "safe_min_qty must be >= warning_max_qty" },
        { status: 400 }
      );
    }

    const existing = await prisma.inventory_item.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Inventory item with this name already exists" },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventory_item.create({
        data: {
          name,
          unit,
          stock_current: stockInitial,
          safe_min_qty: safeMinQty,
          warning_min_qty: warningMinQty,
          warning_max_qty: warningMaxQty,
          is_active: true,
        },
      });

      if (stockInitial > 0) {
        await tx.inventory_stock_change.create({
          data: {
            inventory_item_id: item.inventory_item_id,
            qty_change: stockInitial,
            change_type: "INITIAL",
            note,
            input_by: inputBy,
          },
        });
      }

      return item;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/owner/inventory error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}