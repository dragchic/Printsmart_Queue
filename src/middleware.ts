import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

type SessionPayload = {
  user_id: number;
  username: string;
  role: "OWNER" | "COUNTER_SERVICE" | "MACHINE" | "CASHIER";
};

async function getSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get("queue_session")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // public route
  if (pathname === "/login") {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  // protect owner
  if (pathname.startsWith("/owner")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (session.role !== "OWNER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  // protect counter
  if (pathname.startsWith("/counter")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (
      session.role !== "COUNTER_SERVICE" &&
      session.role !== "OWNER"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/kiosk" || pathname.startsWith("/api/kiosk")) {
    return NextResponse.next();
  }

  // protect worker
  if (pathname.startsWith("/worker")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (
      session.role !== "MACHINE" &&
      session.role !== "OWNER"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/cashier")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  
    if (session.role !== "CASHIER" && session.role !== "OWNER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/kiosk",
    "/owner/:path*",
    "/counter/:path*",
    "/worker/:path*",
    "/api/tickets",
    "/api/kiosk/:path*",
    "/cashier/:path*"
  ],
};
