import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone")?.trim();

    if (!phone) {
      return NextResponse.json(
        { error: "phone is required" },
        { status: 400 }
      );
    }

    if (!phone.startsWith("08")) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(phone)) {
      return NextResponse.json(
        { error: "Phone must be numeric" },
        { status: 400 }
      );
    }

    if (phone.length < 10 || phone.length > 13) {
      return NextResponse.json(
        { error: "Phone length must be 10–13 digits" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        phone_number: phone,
      },
      select: {
        customer_id: true,
        name: true,
        phone_number: true,
      },
    });

    if (customer) {
      return NextResponse.json({
        exists: true,
        customer: {
          customer_id: customer.customer_id,
          name: customer.name,
          phone_number: customer.phone_number,
        },
      });
    }

    return NextResponse.json({
      exists: false,
    });
  } catch (error) {
    console.error("check-customer error:", error);

    return NextResponse.json(
      { error: "Failed to check customer" },
      { status: 500 }
    );
  }
}