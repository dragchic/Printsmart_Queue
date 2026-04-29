import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: session.user_id },
      select: {
        user_id: true,
        full_name: true,
        username: true,
        role: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          username: user.username,
          role: user.role,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to get current user" },
      { status: 500 }
    );
  }
}