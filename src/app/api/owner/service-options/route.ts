import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const item = await prisma.service_option.create({
      data: { name },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create service option" },
      { status: 500 }
    );
  }
}