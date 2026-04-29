import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";

export async function GET() {
  try {
    await requireRole(["OWNER"]);

    const items = await prisma.user.findMany({
      where: {
        is_active: true,
        role: {
          not: "OWNER",
        },
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        user_id: true,
        full_name: true,
        username: true,
        role: true,
        shift: true,
        is_active: true,
        created_at: true,
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error(error);
    return NextResponse.json(
      { error: "Failed to load employees" },
      { status: 500 }
    );
  }
}