import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getInventoryStatus } from "@/lib/inventory-status";

export async function GET() {
  try {
    const items = await prisma.inventory_item.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
    });

    const mapped = items.map((item) => ({
      ...item,
      stock_status: getInventoryStatus(item),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}