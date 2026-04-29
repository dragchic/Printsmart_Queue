import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".mp4"];

export async function GET() {
  try {
    const adsFolder = process.env.ADS_FOLDER_PATH;

    if (!adsFolder) {
      return NextResponse.json(
        { error: "ADS_FOLDER_PATH is not configured" },
        { status: 500 }
      );
    }

    const entries = await fs.readdir(adsFolder, { withFileTypes: true });

    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) =>
        ALLOWED_EXTENSIONS.includes(path.extname(name).toLowerCase())
      );

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Failed to read ads folder:", error);
    return NextResponse.json(
      { error: "Failed to read ads folder" },
      { status: 500 }
    );
  }
}