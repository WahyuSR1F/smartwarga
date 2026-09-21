import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { users, type User } from "../drizzle/schema";
import { getDb } from "./db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const SESSION_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-me"
);

// --- Password Hashing (scrypt) ---

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuf, testBuf);
}

// --- Session Token ---

type SessionPayload = {
  userId: number;
  openId: string;
  name: string;
};

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    openId: payload.openId,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(SESSION_SECRET);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET, {
      algorithms: ["HS256"],
    });
    const userId = payload.userId as number;
    const openId = payload.openId as string;
    const name = payload.name as string;
    if (!openId) return null;
    return { userId, openId, name };
  } catch {
    return null;
  }
}

// --- Register ---

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role?: "platform_admin" | "organization_admin" | "rw_admin" | "rt_admin" | "treasurer" | "resident";
}): Promise<{ user: User; token: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");

  // Check if email already exists
  let existing: User[];
  try {
    existing = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
  } catch (error) {
    console.error("[Auth] Database query failed during registration:", error);
    throw new Error("Gagal mendaftar. Silakan coba lagi.");
  }
  if (existing[0]) {
    throw new Error("Email sudah terdaftar");
  }

  const openId = `local_${crypto.randomUUID()}`;
  const passwordHash = hashPassword(input.password);

  let user: User | undefined;
  try {
    [user] = await db
      .insert(users)
      .values({
        openId,
        passwordHash,
        name: input.name,
        email: input.email,
        loginMethod: "email",
        role: input.role || "resident",
        status: "active",
      })
      .returning();
  } catch (error) {
    console.error("[Auth] Database insert failed during registration:", error);
    throw new Error("Gagal membuat akun. Silakan coba lagi.");
  }

  if (!user) throw new Error("Gagal membuat akun");

  const token = await createSessionToken({
    userId: user.id,
    openId: user.openId,
    name: user.name || "",
  });

  return { user, token };
}

// --- Login ---

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user: User; token: string }> {
  const db = await getDb();
  if (!db) throw new Error("Email atau password salah");

  let result: User[];
  try {
    result = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
  } catch (error) {
    console.error("[Auth] Database query failed during login:", error);
    throw new Error("Email atau password salah");
  }

  const user = result[0];
  if (!user) {
    throw new Error("Email atau password salah");
  }

  if (!user.passwordHash) {
    throw new Error("Akun ini tidak memiliki password. Silakan login dengan metode lain.");
  }

  const isValid = verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new Error("Email atau password salah");
  }

  // Update lastSignedIn
  try {
    await db
      .update(users)
      .set({ lastSignedIn: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));
  } catch (error) {
    console.error("[Auth] Failed to update lastSignedIn:", error);
  }

  const token = await createSessionToken({
    userId: user.id,
    openId: user.openId,
    name: user.name || "",
  });

  return { user, token };
}

// --- Get user from cookie ---

export async function authenticateFromCookie(
  cookieHeader: string | undefined
): Promise<User | null> {
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );

  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    console.error("[Auth] Database query failed during cookie auth:", error);
    return null;
  }
}
