import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

export async function GET(req: NextRequest) {
  try {
    const adsFolder = process.env.ADS_FOLDER_PATH;
    const fileName = req.nextUrl.searchParams.get("name");

    if (!adsFolder) {
      return NextResponse.json(
        { error: "ADS_FOLDER_PATH is not configured" },
        { status: 500 }
      );
    }

    if (!fileName) {
      return NextResponse.json(
        { error: "Missing file name" },
        { status: 400 }
      );
    }

    const safeName = path.basename(fileName);
    const filePath = path.join(adsFolder, safeName);
    const ext = path.extname(safeName).toLowerCase();

    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to serve ads file:", error);
    return NextResponse.json(
      { error: "Failed to serve ads file" },
      { status: 500 }
    );
  }
}