import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".ai",
  ".cdr",
  ".psd",
  ".svg",
  ".tif",
  ".tiff",
]);

function sanitizeFileName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);

  const safeBase = base
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80);

  return {
    ext,
    safeBase: safeBase || "file",
  };
}

function formatDateFolder(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const ticketIdRaw = formData.get("ticket_id");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    const ticketId = Number(ticketIdRaw);
    if (!ticketId || Number.isNaN(ticketId)) {
      return NextResponse.json(
        { error: "ticket_id is required and must be valid" },
        { status: 400 }
      );
    }

    const ticket = await prisma.queue_ticket.findUnique({
      where: { ticket_id: ticketId },
      select: {
        ticket_id: true,
        ticket_date: true,
        queue_number: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
        },
        { status: 400 }
      );
    }

    const { ext, safeBase } = sanitizeFileName(file.name);

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: `File type not allowed: ${ext || "unknown"}`,
        },
        { status: 400 }
      );
    }

    const dateFolder = formatDateFolder(
      ticket.ticket_date ? new Date(ticket.ticket_date) : new Date()
    );

    const uploadRoot = path.join(process.cwd(), "uploads", "order-files");
    const ticketFolder = path.join(uploadRoot, dateFolder, `ticket-${ticket.ticket_id}`);

    await mkdir(ticketFolder, { recursive: true });

    const timestamp = Date.now();
    const storedFileName = `${timestamp}_${safeBase}${ext}`;
    const absoluteFilePath = path.join(ticketFolder, storedFileName);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absoluteFilePath, fileBuffer);

    const relativeFilePath = path
      .join("uploads", "order-files", dateFolder, `ticket-${ticket.ticket_id}`, storedFileName)
      .replace(/\\/g, "/");

    return NextResponse.json({
      success: true,
      file: {
        source_type: "LOCAL_UPLOAD",
        ticket_id: ticket.ticket_id,
        queue_number: ticket.queue_number,
        customer_name: ticket.customer?.name ?? null,
        original_file_name: file.name,
        stored_file_name: storedFileName,
        file_path: `/${relativeFilePath}`,
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
      },
    });
  } catch (error) {
    console.error("Upload file error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}