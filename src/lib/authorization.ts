import { getSession } from "@/lib/session";

export type AppRole = "OWNER" | "COUNTER_SERVICE" | "MACHINE" | "CASHIER";

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const session = await getSession();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  if (!allowedRoles.includes(session.role as AppRole)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}