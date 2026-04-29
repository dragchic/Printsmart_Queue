import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    console.log("LOGIN BODY:", body);

    const user = await prisma.user.findUnique({
      where: { username },
    });

    console.log("USER FOUND:", user ? {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      is_active: user.is_active,
      role: user.role,
    } : null);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "User is inactive" },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    console.log("PASSWORD VALID:", valid);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    await setSessionCookie({
      user_id: user.user_id,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to login" },
      { status: 500 }
    );
  }
}