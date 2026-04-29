import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireRole } from "@/lib/authorization";
import { handleAuthError } from "@/lib/api-auth";
import { WorkShift } from "@/generated/prisma/enums";

export async function POST(req: Request) {
    try{
        const session = await requireRole(["OWNER"]);

        const body = await req.json();

        const fullName = String(body.full_name ?? "").trim();
        const username = String(body.username ?? "").trim();
        const password = String(body.password ?? "").trim();
        const role = String(body.role ?? "").trim();
        const shift = String(body.shift ?? "").trim();

        if (!fullName || !username || !password || !role) {
            return NextResponse.json(
              { error: "All fields are required" },
              { status: 400 }
            );
        }

        if (!["COUNTER_SERVICE", "MACHINE", "CASHIER"].includes(role)) {
            return NextResponse.json(
                { error: "INvalid role" },
                { status: 400 }
            )
        }

        const exisitingUser = await prisma.user.findFirst({
            where: { username },
        });

        // If account has registered before
        if (exisitingUser) {
            return NextResponse.json(
                { error: "Username already exists" },
                { status: 400 }
            )
        }

        // Create new user
        const passwordHash = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                full_name: fullName,
                username,
                password_hash: passwordHash,
                role: role as "COUNTER_SERVICE" | "MACHINE" | "CASHIER",
                shift: shift as "PAGI" | "MALAM",
                is_active: true,
                created_by_id: session.user_id,
            },
        });

        return NextResponse.json({
            success: true,
            user: {
              user_id: newUser.user_id,
              full_name: newUser.full_name,
              username: newUser.username,
              role: newUser.role,
              is_active: newUser.is_active,
            },
          });
        } catch (error) {
            const authResponse = handleAuthError(error);
            if (authResponse) return authResponse;
            
            console.error(error);
      
        return NextResponse.json(
            { error: "Failed to create employee" },
            { status: 500 }
        );
    }
}