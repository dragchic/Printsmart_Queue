import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        created_at: "asc",
      },
      include: {
        queue_tickets: {
          include: {
            items: {
              include: {
                service_option: true,
              },
            },
          },
        },
      },
    });

    const items = customers.map((customer, index) => {
      const serviceNames = new Set<string>();

      for (const ticket of customer.queue_tickets ?? []) {
        for (const item of ticket.items ?? []) {
          const serviceName =
            item.service_option?.name ||
            item.custom_service_name;

          if (serviceName) {
            serviceNames.add(serviceName);
          }
        }
      }

      return {
        customer_id: customer.customer_id,
        no: index + 1,
        name: customer.name,
        phone_number: customer.phone_number,
        service_types:
          serviceNames.size > 0 ? Array.from(serviceNames).join(", ") : "-",
        queue_tickets: customer.queue_tickets, // 🔥 ini penting
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    if (!phone.startsWith("08")) {
      return NextResponse.json(
        { error: "Phone must start with 08" },
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

    const customer = await prisma.customer.upsert({
      where: { phone_number: phone },
      update: { name },
      create: { name, phone_number: phone },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}