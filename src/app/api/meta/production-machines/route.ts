import { NextResponse } from "next/server";
import { ProductionMachine } from "@/generated/prisma/enums";

export async function GET() {
  try {
    const items = Object.values(ProductionMachine);

    return NextResponse.json({
      items,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load production machines" },
      { status: 500 }
    );
  }
}