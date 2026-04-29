import { NextResponse } from "next/server";
import { printQueueTicket } from "@/lib/print";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const queueNumber = String(body.queueNumber ?? "").trim();
    const customerName = String(body.customerName ?? "").trim();

    if (!queueNumber) {
      return NextResponse.json(
        { error: "Queue number wajib diisi" },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        { error: "Customer name wajib diisi" },
        { status: 400 }
      );
    }

    await printQueueTicket(queueNumber, customerName);

    return NextResponse.json({
      success: true,
      message: "Ticket berhasil dicetak",
    });
  } catch (error) {
    console.error("Print queue ticket error:", error);

    return NextResponse.json(
      { error: "Gagal mencetak nomor antrean" },
      { status: 500 }
    );
  }
}