import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const customerId = Number(id);

    if (!customerId || Number.isNaN(customerId)) {
      return NextResponse.json(
        { error: "Invalid customer id" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { customer_id: customerId },
      include: {
        queue_tickets: {
          include: {
            items: {
              include: {
                materials: true,
                files: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const ticketIds = customer.queue_tickets.map((ticket) => ticket.ticket_id);
    const itemIds = customer.queue_tickets.flatMap((ticket) =>
      ticket.items.map((item) => item.id)
    );
    const materialIds = customer.queue_tickets.flatMap((ticket) =>
      ticket.items.flatMap((item) =>
        item.materials.map((material) => material.queue_ticket_item_material_id)
      )
    );

    await prisma.$transaction(async (tx) => {
      if (materialIds.length > 0) {
        await tx.queue_ticket_item_material_usage.deleteMany({
          where: {
            queue_ticket_item_material_id: {
              in: materialIds,
            },
          },
        });
      }

      if (itemIds.length > 0) {
        await tx.order_file.deleteMany({
          where: {
            queue_ticket_item_id: {
              in: itemIds,
            },
          },
        });

        await tx.queue_ticket_item_material.deleteMany({
          where: {
            queue_ticket_item_id: {
              in: itemIds,
            },
          },
        });

        await tx.queue_ticket_item.deleteMany({
          where: {
            id: {
              in: itemIds,
            },
          },
        });
      }

      if (ticketIds.length > 0) {
        await tx.order_inventory_usage.deleteMany({
          where: {
            ticket_id: {
              in: ticketIds,
            },
          },
        });

        await tx.inventory_stock_change.deleteMany({
          where: {
            ticket_id: {
              in: ticketIds,
            },
          },
        });

        await tx.queue_ticket.deleteMany({
          where: {
            ticket_id: {
              in: ticketIds,
            },
          },
        });
      }

      await tx.customer.delete({
        where: {
          customer_id: customerId,
        },
      });
    });

    return NextResponse.json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}