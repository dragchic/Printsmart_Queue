import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.service_option.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
      select: {
        service_option_id: true,
        name: true,
      },
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load service options" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
    try {
      const body = await req.json();
      const name = String(body.name ?? "").trim();
  
      if (!name) {
        return NextResponse.json(
          { error: "Service option name is required" },
          { status: 400 }
        );
      }
  
      const existing = await prisma.service_option.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });
  
      if (existing) {
        return NextResponse.json(
          { error: "Service option already exists" },
          { status: 400 }
        );
      }
  
      const created = await prisma.service_option.create({
        data: {
          name,
          is_active: true,
        },
      });
  
      return NextResponse.json(created, { status: 201 });
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "Failed to create service option" },
        { status: 500 }
      );
    }
  }