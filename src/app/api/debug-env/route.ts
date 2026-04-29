import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    exists: !!process.env.DATABASE_URL,
    type: typeof process.env.DATABASE_URL,
    raw: process.env.DATABASE_URL ?? null,
  });
}