import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_MACHINES = [
  "MESIN_A3_PLUS",
  "MESIN_DTF",
  "MESIN_INDOOR",
  "MESIN_PLOTTER",
  "MESIN_UV",
] as const;

type ProductionMachine = (typeof ALLOWED_MACHINES)[number];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const machine = searchParams.get("machine");
    const onlyActive = searchParams.get("only_active") ?? "true";

    if (!machine || !ALLOWED_MACHINES.includes(machine as ProductionMachine)) {
      return NextResponse.json(
        {
          error:
            "Valid machine query is required: MESIN_A3_PLUS | MESIN_DTF | MESIN_INDOOR | MESIN_PLOTTER | MESIN_UV",
        },
        { status: 400 }
      );
    }

    const whereClause = {
      production_machine: machine as ProductionMachine,
      ...(onlyActive === "true"
        ? {
            machine_status: {
              not: "DONE" as const,
            },
            queue_ticket: {
              status: "SERVING" as const,
            },
          }
        : {}),
    };

    const items = await prisma.queue_ticket_item.findMany({
      where: whereClause,
      include: {
        queue_ticket: {
          select: {
            ticket_id: true,
            queue_number: true,
            ticket_date: true,
            status: true,
            pickup_method: true,
            pickup_status: true,
            customer: {
              select: {
                customer_id: true,
                name: true,
                phone_number: true,
              },
            },
          },
        },
        service_option: {
          select: {
            service_option_id: true,
            name: true,
          },
        },
        materials: {
          include: {
            inventory_item: {
              select: {
                inventory_item_id: true,
                name: true,
                unit: true,
                stock_current: true,
              },
            },
            usages: {
              orderBy: {
                created_at: "desc",
              },
            },
          },
          orderBy: {
            sort_order: "asc",
          },
        },
        files: true,
      },
      orderBy: [
        {
          created_at: "asc",
        },
      ],
    });

    const mapped = items.map((item) => ({
      id: item.id,
      ticket_id: item.ticket_id,
      queue_number: item.queue_ticket.queue_number,
      customer_name: item.queue_ticket.customer.name,
      customer_phone: item.queue_ticket.customer.phone_number,

      service_option_id: item.service_option_id,
      service_name:
        item.service_option?.name ?? item.custom_service_name ?? "Custom Service",

      order_qty: item.order_qty,
      note: item.note,
      production_machine: item.production_machine,
      needs_finishing: item.needs_finishing,

      machine_status: item.machine_status,
      machine_note: item.machine_note,
      processed_by: item.processed_by,
      machine_started_at: item.machine_started_at,
      machine_finished_at: item.machine_finished_at,

      pickup_method: item.queue_ticket.pickup_method,
      pickup_status: item.queue_ticket.pickup_status,

      materials: item.materials.map((material) => ({
        queue_ticket_item_material_id: material.queue_ticket_item_material_id,
        inventory_item_id: material.inventory_item_id,
        inventory_name: material.inventory_item.name,
        unit: material.inventory_item.unit,
        stock_current: material.inventory_item.stock_current,
        specification_label:
          material.specification_label ?? material.inventory_item.name,
        qty_planned: material.qty_planned,
        sort_order: material.sort_order,
        latest_usage:
          material.usages.length > 0
            ? {
                qty_good: material.usages[0].qty_good,
                qty_waste: material.usages[0].qty_waste,
                qty_total_used: material.usages[0].qty_total_used,
                input_by: material.usages[0].input_by,
                note: material.usages[0].note,
                created_at: material.usages[0].created_at,
              }
            : null,
      })),

      files: item.files.map((file) => ({
        order_file_id: file.order_file_id,
        source_type: file.source_type,
        original_file_name: file.original_file_name,
        stored_file_name: file.stored_file_name,
        file_path: file.file_path,
        mime_type: file.mime_type,
        file_size_bytes: file.file_size_bytes,
        gdrive_url: file.gdrive_url,
      })),
      
    }));

    return NextResponse.json({
      machine,
      total: mapped.length,
      data: mapped,
    });
  } catch (error: any) {
    console.error("GET /api/worker/machine/tasks error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch machine tasks",
        detail: error?.message ?? null,
      },
      { status: 500 }
    );
  }
}