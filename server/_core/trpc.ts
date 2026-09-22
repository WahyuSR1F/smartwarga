import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Global error handler: catches ANY unhandled error (database, network, etc.)
 * and returns a generic user-facing message. The original error is logged
 * server-side for debugging. This prevents SQL queries, stack traces, and
 * internal details from leaking to the client.
 */
const errorHandler = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    // TRPCError already has a safe user-facing message — re-throw as-is
    if (err instanceof TRPCError) throw err;

    // Log the real error for server-side debugging
    console.error("[tRPC] Unhandled error:", err);

    // Return a generic message to the client
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan. Silakan coba lagi.",
    });
  }
});

export const protectedProcedure = t.procedure.use(requireUser).use(errorHandler);
export const publicProcedure = t.procedure.use(errorHandler);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'platform_admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
).use(errorHandler);
