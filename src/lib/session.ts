import { cookies } from "next/headers";
import {
  createSessionToken,
  verifySessionToken,
  SessionPayload,
} from "@/lib/auth";

const COOKIE_NAME = "queue_session";

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}