import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole(["OWNER"]);

    const { id } = await params;
    const userId = Number(id);

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = await req.json();

    const username = String(body.username || "").trim();
    const full_name = String(body.full_name || "").trim();
    const role = String(body.role || "").trim();
    const shift = String(body.shift || "").trim();

    if (!username) {
      return NextResponse.json(
        { error: "Username wajib diisi." },
        { status: 400 }
      );
    }

    if (!full_name) {
      return NextResponse.json(
        { error: "Nama worker wajib diisi." },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: "Divisi wajib dipilih." },
        { status: 400 }
      );
    }

    if (!shift) {
      return NextResponse.json(
        { error: "Shift wajib dipilih." },
        { status: 400 }
      );
    }

    const validRoles = ["COUNTER_SERVICE", "MACHINE", "CASHIER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Role tidak valid." }, { status: 400 });
    }

    const validShifts = ["PAGI", "MALAM"];
    if (!validShifts.includes(shift)) {
      return NextResponse.json(
        { error: "Shift tidak valid." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        NOT: {
          user_id: userId,
        },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username sudah digunakan." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        user_id: userId,
      },
      data: {
        username,
        full_name,
        role: role as any,
        shift: shift as any,
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

    return NextResponse.json(updatedUser);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error(error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(["OWNER"]);

    const { id } = await params;
    const userId = Number(id);

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Lepas relasi dari queue_ticket
      await tx.queue_ticket.updateMany({
        where: { handled_by_id: userId },
        data: { handled_by_id: null },
      });

      await tx.queue_ticket.updateMany({
        where: { machine_notified_by_id: userId },
        data: { machine_notified_by_id: null },
      });

      await tx.queue_ticket.updateMany({
        where: { picked_up_by: userId },
        data: { picked_up_by: null },
      });

      // 2. Hapus user
      await tx.user.delete({
        where: {
          user_id: userId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}