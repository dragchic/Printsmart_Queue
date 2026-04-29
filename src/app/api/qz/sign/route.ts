import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const toSign = req.nextUrl.searchParams.get("request");

    if (!toSign) {
      return NextResponse.json(
        { error: "Missing request parameter" },
        { status: 400 }
      );
    }

    const privateKeyPath = path.join(process.cwd(), "secrets", "private-key.pem");
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");

    const signer = crypto.createSign("RSA-SHA512");
    signer.update(toSign, "utf8");
    signer.end();

    const signature = signer.sign(privateKey, "base64");

    return new NextResponse(signature, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("QZ SIGN ERROR:", error);
    return NextResponse.json(
      { error: "Failed to sign request" },
      { status: 500 }
    );
  }
}