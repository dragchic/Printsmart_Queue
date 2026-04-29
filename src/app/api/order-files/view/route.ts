import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const filePath = req.nextUrl.searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "path is required" },
        { status: 400 }
      );
    }

    const normalized = filePath.replace(/^\/+/, "");
    const absolutePath = path.join(process.cwd(), normalized);

    if (!existsSync(absolutePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(absolutePath);
    const fileName = path.basename(absolutePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("VIEW FILE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to open file" },
      { status: 500 }
    );
  }
}