import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastTicket } from "@/lib/ticket-bus";
import { ProductionMachine } from "@/generated/prisma/enums";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type IncomingFileAttachment = {
  source_type: "LOCAL_UPLOAD" | "GDRIVE_LINK";
  original_file_name?: string | null;
  stored_file_name?: string | null;
  file_path?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  gdrive_url?: string | null;
};

type ProductionMachineValue =
  (typeof ProductionMachine)[keyof typeof ProductionMachine];

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const ticketId = Number(id);

    if (!ticketId || Number.isNaN(ticketId)) {
      return NextResponse.json(
        { error: "Invalid ticketId" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items is required" },
        { status: 400 }
      );
    }

    const ticket = await prisma.queue_ticket.findUnique({
      where: { ticket_id: ticketId },
      select: {
        ticket_id: true,
        status: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const validProductionMachines = Object.values(
      ProductionMachine
    ) as ProductionMachineValue[];

    const result = await prisma.$transaction(async (tx) => {
      const createdItems = [];

      for (const item of items) {
        const {
          service_option_id,
          custom_service_name,
          order_qty,
          note,
          production_machine,
          needs_finishing,
          materials,
          file_attachment,
        } = item as {
          service_option_id?: number | null;
          custom_service_name?: string | null;
          order_qty?: number;
          note?: string | null;
          production_machine?: string | null;
          needs_finishing?: boolean;
          materials?: any[];
          file_attachment?: IncomingFileAttachment | null;
        };

        if (!order_qty || (!service_option_id && !custom_service_name)) {
          throw new Error("Invalid item data");
        }

        if (!materials || !Array.isArray(materials) || materials.length === 0) {
          throw new Error("Materials is required per item");
        }

        let parsedProductionMachine: ProductionMachineValue | null = null;

        if (production_machine) {
          if (
            !validProductionMachines.includes(
              production_machine as ProductionMachineValue
            )
          ) {
            throw new Error("Invalid production machine");
          }

          parsedProductionMachine =
            production_machine as ProductionMachineValue;
        }

        const inventoryIds = materials.map((m: any) =>
          Number(m.inventory_item_id)
        );

        const inventoryCheck = await tx.inventory_item.findMany({
          where: {
            inventory_item_id: { in: inventoryIds },
            is_active: true,
          },
          select: {
            inventory_item_id: true,
          },
        });

        if (inventoryCheck.length !== inventoryIds.length) {
          throw new Error("Some inventory items not found");
        }

        if (file_attachment) {
          if (
            file_attachment.source_type !== "LOCAL_UPLOAD" &&
            file_attachment.source_type !== "GDRIVE_LINK"
          ) {
            throw new Error("Invalid file attachment source_type");
          }

          if (file_attachment.source_type === "LOCAL_UPLOAD") {
            if (
              !file_attachment.file_path ||
              !file_attachment.stored_file_name
            ) {
              throw new Error("Invalid local file attachment data");
            }
          }

          if (file_attachment.source_type === "GDRIVE_LINK") {
            if (!file_attachment.gdrive_url?.trim()) {
              throw new Error("Google Drive link is required");
            }
          }
        }

        const createdItem = await tx.queue_ticket_item.create({
          data: {
            ticket_id: ticketId,
            service_option_id: service_option_id || null,
            custom_service_name: custom_service_name || null,
            order_qty: Number(order_qty),
            note: note || null,
            production_machine: parsedProductionMachine,
            needs_finishing: needs_finishing ?? false,
            machine_status: "WAITING",
          },
        });

        const createdItemId = createdItem.id;

        const materialsData = materials.map((mat: any, index: number) => ({
          queue_ticket_item_id: createdItemId,
          inventory_item_id: Number(mat.inventory_item_id),
          specification_label: mat.specification_label || null,
          qty_planned:
            mat.qty_planned !== undefined && mat.qty_planned !== null
              ? Number(mat.qty_planned)
              : null,
          sort_order: mat.sort_order ?? index,
        }));

        await tx.queue_ticket_item_material.createMany({
          data: materialsData,
        });

        if (file_attachment) {
          await tx.order_file.create({
            data: {
              queue_ticket_item_id: createdItemId,
              source_type: file_attachment.source_type,
              original_file_name:
                file_attachment.original_file_name?.trim() || null,
              stored_file_name:
                file_attachment.stored_file_name?.trim() || null,
              file_path: file_attachment.file_path?.trim() || null,
              mime_type: file_attachment.mime_type?.trim() || null,
              file_size_bytes:
                file_attachment.file_size_bytes !== undefined &&
                file_attachment.file_size_bytes !== null
                  ? Number(file_attachment.file_size_bytes)
                  : null,
              gdrive_url: file_attachment.gdrive_url?.trim() || null,
            },
          });
        }

        createdItems.push(createdItem);
      }

      return createdItems;
    });

    broadcastTicket({
      type: "machine_task_changed",
      action: "created",
      ticket_id: ticketId,
      at: Date.now(),
    });

    return NextResponse.json({
      message: "Items created successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("ERROR CREATE ITEM:", error);

    return NextResponse.json(
      {
        error: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}