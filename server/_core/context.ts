import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateFromCookie, verifySessionToken } from "../auth";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Check Authorization header first (Bearer token from sessionStorage)
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const session = await verifySessionToken(token);
      if (session) {
        const db = await getDb();
        if (db) {
          const result = await db
            .select()
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);
          user = result[0] ?? null;
        }
      }
    }

    // Fallback to cookie
    if (!user) {
      user = await authenticateFromCookie(opts.req.headers.cookie);
    }
  } catch (error) {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
