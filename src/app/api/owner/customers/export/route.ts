import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
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

    // Format ke CSV
    const rows = [];

    rows.push(["ID", "Nama", "Nomor", "Product"]);

    customers.forEach((customer, index) => {
      const products = new Set<string>();

      customer.queue_tickets.forEach((ticket) => {
        ticket.items.forEach((item) => {
          if (item.service_option?.name) {
            products.add(item.service_option.name);
          }
        });
      });

      rows.push([
        `A-${String(index + 1).padStart(3, "0")}`,
        customer.name,
        customer.phone_number,
        Array.from(products).join(", "),
      ]);
    });

    const csvContent = rows
      .map((row) => row.map((val) => `"${val}"`).join(","))
      .join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=customers.csv",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to export CSV" },
      { status: 500 }
    );
  }
}