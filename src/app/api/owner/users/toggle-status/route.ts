import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const userId = Number(body.user_id);

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid user_id" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ❗ prevent owner deactivate dirinya sendiri
    if (user.user_id === session.user_id) {
      return NextResponse.json(
        { error: "Cannot deactivate yourself" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { user_id: userId },
      data: {
        is_active: !user.is_active,
      },
    });

    return NextResponse.json({
      success: true,
      is_active: updated.is_active,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}